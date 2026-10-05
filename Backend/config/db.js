import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import net from "net";
import { resolveSrv, resolveTxt, lookup } from "dns/promises";
import { URL } from "url";
import { startNotificationCron } from "../cron/notificationCron.js";
import { seedSampleData } from "../utils/seedSampleData.js";

let memoryServer = null;

/* ==========================================================================
   [ATLAS-DIAGNOSTIC] TEMPORARY - safe to delete once GoDaddy connectivity
   is resolved. Read-only diagnostics: never mutates the connection options
   and never emits credentials, the URI, or the connection string.
   ========================================================================== */

const ATLAS_DIAG_TAG = "[ATLAS-DIAGNOSTIC]";

// Literal credential fragments lifted from MONGO_URI so they can also be
// scrubbed when the server echoes them back inside an auth error (MongoDB
// auth failures can name the database user). Never logged itself.
const ATLAS_URI_SECRETS = [];

const resetAtlasUriSecrets = (uri) => {
  ATLAS_URI_SECRETS.length = 0;
  try {
    const parsed = new URL(uri);
    for (const fragment of [parsed.username, parsed.password]) {
      if (!fragment) continue;
      ATLAS_URI_SECRETS.push(fragment);
      try {
        const decoded = decodeURIComponent(fragment);
        if (decoded) ATLAS_URI_SECRETS.push(decoded);
      } catch {
        /* fragment was not URI-encoded */
      }
    }
  } catch {
    /* unparseable URI - nothing to lift */
  }
};

// Driver errors can embed the full connection string, so every string that
// reaches a log line is scrubbed first.
const redactAtlasSecrets = (value) => {
  if (value === undefined || value === null) return value;
  let out = String(value)
    .replace(/mongodb(\+srv)?:\/\/[^\s"'<>]+/gi, "mongodb://<redacted-uri>")
    .replace(/:\/\/[^/\s:@]+:[^/\s@]+@/g, "://<redacted-credentials>@")
    .replace(/\b(pass(word|wd)?|pwd|secret|token)\s*[=:]\s*[^\s&,;]+/gi, "$1=<redacted>");
  // Shortest secrets are skipped: scrubbing a 1-2 char string would shred
  // unrelated text and make the diagnostic unreadable.
  for (const secret of ATLAS_URI_SECRETS) {
    if (secret && secret.length >= 3) out = out.split(secret).join("<redacted>");
  }
  return out;
};

/**
 * Resolves the Atlas hosts and TCP-probes each one. Hostnames/ports only -
 * no credentials, no URI echo.
 */
const runAtlasPreflight = async () => {
  // stderr, not stdout: stdout is block-buffered when piped and this process
  // ends in process.exit(1), which discards unflushed stdout.
  const log = (...args) => console.error(ATLAS_DIAG_TAG, ...args);

  const uri = process.env.MONGO_URI;
  if (!uri) {
    log("MONGO_URI is not set; skipping startup reachability diagnostic");
    return;
  }

  try {
    resetAtlasUriSecrets(uri);

    // Hostname only. The URI, query string, username and password are never
    // read into a loggable variable.
    const parsed = new URL(uri);
    const hostname = parsed.hostname;

    if (!uri.startsWith("mongodb+srv://")) {
      log(
        `SRV hostname=${hostname} SKIPPED reason=not-an-srv-uri`,
      );
      return;
    }

    log(`SRV hostname=${hostname}`);

    // A. SRV + TXT resolution.
    let records = [];
    try {
      records = await resolveSrv(`_mongodb._tcp.${hostname}`);
      log(`SRV records=${records.length}`);
      for (const r of records) {
        log(`SRV target=${r.name} port=${r.port}`);
      }
    } catch (srvErr) {
      log(`SRV FAILED code=${srvErr?.code} message=${redactAtlasSecrets(srvErr?.message)}`);
      return;
    }

    if (records.length === 0) {
      log("SRV returned 0 records; no targets to probe");
      return;
    }

    try {
      const txt = await resolveTxt(hostname);
      log(`TXT records=${txt.length}`);
      for (const entry of txt) {
        for (const part of entry) {
          // TXT is advisory; never echoed in full in case it carries values.
          log(`TXT key=${part.split("=")[0]}`);
        }
      }
    } catch (txtErr) {
      log(`TXT FAILED code=${txtErr?.code} message=${redactAtlasSecrets(txtErr?.message)}`);
    }

    for (const r of records) {
      const target = r.name;
      const port = r.port;

      // C. Forward DNS for the SRV target itself.
      try {
        const resolved = await lookup(target);
        log(`DNS target=${target} address=${resolved.address} family=${resolved.family}`);
      } catch (dnsErr) {
        log(`DNS target=${target} FAILED code=${dnsErr?.code}`);
      }

      // B. TCP reachability on the port the SRV record returned, 5s cap.
      await new Promise((resolve) => {
        let settled = false;
        const socket = net.connect({ host: target, port });
        const done = (line) => {
          if (settled) return;
          settled = true;
          try {
            socket.destroy();
          } catch {
            /* already torn down */
          }
          log(line);
          resolve();
        };
        socket.setTimeout(5000);
        socket.once("connect", () => done(`TCP target=${target}:${port} SUCCESS`));
        socket.once("timeout", () =>
          done(`TCP target=${target}:${port} FAILED code=ETIMEDOUT message=socket timeout after 5000ms`),
        );
        socket.once("error", (err) =>
          done(
            `TCP target=${target}:${port} FAILED code=${err?.code} message=${redactAtlasSecrets(err?.message)}`,
          ),
        );
      });
    }
  } catch (err) {
    log(
      `startup diagnostic FAILED name=${err?.name} code=${err?.code} message=${redactAtlasSecrets(err?.message)}`,
    );
  }
};

/** Dumps the driver error tree (server list included) with secrets scrubbed. */
const logAtlasConnectFailure = (label, err) => {
  const log = (...args) => console.error(ATLAS_DIAG_TAG, label, ...args);

  log("----- connect failure -----");
  log(`name=${err?.name}`);
  log(`message=${redactAtlasSecrets(err?.message)}`);
  log(`code=${err?.code}`);
  log(`codeName=${err?.codeName}`);

  if (!err?.reason) {
    log("reason=<none>");
    log("--------------------------");
    return;
  }

  const reason = err.reason;
  log(
    `reason.type=${reason.type ?? reason.name ?? typeof reason} reason.message=${redactAtlasSecrets(reason.message)}`,
  );

  const rawServers = reason.servers;
  const servers = Array.isArray(rawServers)
    ? rawServers
    : rawServers && typeof rawServers === "object"
      ? Object.values(rawServers)
      : [];

  log(`reason.servers count=${servers.length}`);
  servers.forEach((s, i) => {
    log(`  server[${i}] address=${s?.address} type=${s?.type}`);
    log(`    errorName=${s?.error?.name}`);
    log(`    errorMessage=${redactAtlasSecrets(s?.error?.message)}`);
    log(`    errorCode=${s?.error?.code}`);
  });
  log("--------------------------");
};

/* ===== end [ATLAS-DIAGNOSTIC] ===== */

const expandSrvUri = async (uri) => {
  if (!uri || !uri.startsWith("mongodb+srv://")) {
    return uri;
  }

  const parsed = new URL(uri);
  const srvRecords = await resolveSrv(`_mongodb._tcp.${parsed.hostname}`);
  const txtRecords = await resolveTxt(parsed.hostname);

  const hosts = srvRecords.map((record) => `${record.name}:${record.port}`).join(",");
  const params = new URLSearchParams(parsed.search);

  for (const txtEntry of txtRecords.flat()) {
    for (const pair of txtEntry.split("&")) {
      const separatorIndex = pair.indexOf("=");
      if (separatorIndex > 0) {
        const key = pair.slice(0, separatorIndex);
        const value = pair.slice(separatorIndex + 1);
        if (!params.has(key)) {
          params.set(key, value);
        }
      }
    }
  }

  const authPart = `${encodeURIComponent(parsed.username)}:${encodeURIComponent(parsed.password)}@`;
  const pathname = parsed.pathname && parsed.pathname !== "/" ? parsed.pathname : "";
  const query = params.toString();

  return `mongodb://${authPart}${hosts}${pathname}${query ? `?${query}` : ""}`;
};

const connectDB = async () => {
  try {
    const useAtlas = process.env.USE_ATLAS_DB === "true";

    if (process.env.NODE_ENV === "production" && !useAtlas) {
      throw new Error(
        "Production requires USE_ATLAS_DB=true and a valid MONGO_URI (MongoDB Atlas).",
      );
    }

    if (useAtlas) {
      const atlasUri = process.env.MONGO_URI;
      if (!atlasUri) {
        throw new Error("MONGO_URI is missing while USE_ATLAS_DB=true");
      }

      // [ATLAS-DIAGNOSTIC] TEMPORARY - standalone startup reachability
      // diagnostic (SRV + TXT + DNS lookup + TCP). Reads MONGO_URI from
      // process.env itself and logs hostnames/ports/codes only.
      await runAtlasPreflight();

      try {
        const conn = await mongoose.connect(atlasUri, {
          serverSelectionTimeoutMS: 15000,
        });
        console.log("MongoDB Connected Successfully (Atlas)");
        await ensureParentUsernameIndex();
        await ensureNotificationSystemKeyIndex();
        startNotificationCron();
        return conn;
      } catch (primaryError) {
        // [ATLAS-DIAGNOSTIC] TEMPORARY
        logAtlasConnectFailure("primary attempt", primaryError);
        // Retry direct SRV once for transient DNS/network hiccups.
        try {
          const retryConn = await mongoose.connect(atlasUri, {
            serverSelectionTimeoutMS: 15000,
          });
          console.warn(
            "MongoDB Atlas connected on retry after initial error:",
            primaryError.message,
          );
          await ensureParentUsernameIndex();
          await ensureNotificationSystemKeyIndex();
          startNotificationCron();
          return retryConn;
        } catch (retryError) {
          // [ATLAS-DIAGNOSTIC] TEMPORARY
          logAtlasConnectFailure("retry attempt", retryError);
          const primaryMessage = String(primaryError?.message || "");
          const shouldTryExpanded =
            primaryMessage.includes("querySrv") ||
            primaryMessage.includes("_mongodb._tcp") ||
            primaryMessage.includes("mongodb+srv");

          if (!shouldTryExpanded) {
            throw retryError;
          }

          // In some environments SRV DNS lookup fails; fallback to expanded host URI.
          const expandedUri = await expandSrvUri(atlasUri);
          const conn = await mongoose.connect(expandedUri, {
            serverSelectionTimeoutMS: 15000,
          });
          console.warn(
            "MongoDB Atlas connected using expanded SRV URI fallback:",
            retryError.message,
          );
          await ensureParentUsernameIndex();
          await ensureNotificationSystemKeyIndex();
          startNotificationCron();
          return conn;
        }
      }
    }

    console.warn("Using in-memory MongoDB for local development...");

    if (!memoryServer) {
      // Imported lazily on purpose. This package is a dev-only fallback and its
      // postinstall downloads a ~100MB MongoDB binary, which is slow and fragile
      // on shared hosting. Production always takes the Atlas branch above.
      const { MongoMemoryServer } = await import("mongodb-memory-server");
      memoryServer = await MongoMemoryServer.create();
    }

    await mongoose.connect(memoryServer.getUri(), {
      dbName: "EduaitorLocal",
    });

    await seedSampleData();
    console.log("MongoDB Connected Successfully (in-memory fallback)");
    await ensureParentUsernameIndex();
    await ensureNotificationSystemKeyIndex();
    startNotificationCron();
    return mongoose.connection;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
};

/** Allow sibling students to share parent username (father mobile). */
export async function ensureParentUsernameIndex() {
  try {
    const col = mongoose.connection.collection("students");
    const indexes = await col.indexes();
    const uniqueParent = indexes.find(
      (idx) =>
        idx.key?.schoolId === 1 &&
        idx.key?.["parentCredentials.username"] === 1 &&
        idx.unique === true,
    );
    if (uniqueParent?.name) {
      await col.dropIndex(uniqueParent.name);
      console.log(
        `Dropped unique parent username index (${uniqueParent.name}) for multi-child support`,
      );
    }
  } catch (err) {
    console.warn("Parent username index migrate skipped:", err.message);
  }
}

/**
 * Unique systemKey must not apply to null/missing values.
 * Old sparse unique index still indexed null → E11000 on event create.
 */
export async function ensureNotificationSystemKeyIndex() {
  try {
    const col = mongoose.connection.collection("notifications");
    await col.updateMany(
      { $or: [{ systemKey: null }, { systemKey: "" }] },
      { $unset: { systemKey: "" } },
    );

    const indexes = await col.indexes();
    const systemKeyIdx = indexes.find(
      (idx) => idx.name === "systemKey_1" || idx.key?.systemKey === 1,
    );
    const hasPartial =
      systemKeyIdx?.partialFilterExpression?.systemKey?.$type === "string";

    if (systemKeyIdx?.name && !hasPartial) {
      await col.dropIndex(systemKeyIdx.name);
      console.log(
        `Dropped legacy notifications.${systemKeyIdx.name} (nulls collided)`,
      );
    }

    if (!hasPartial) {
      await col.createIndex(
        { systemKey: 1 },
        {
          unique: true,
          name: "systemKey_1",
          partialFilterExpression: { systemKey: { $type: "string" } },
        },
      );
      console.log("Ensured notifications.systemKey_1 partial unique index");
    }
  } catch (err) {
    console.warn("Notification systemKey index migrate skipped:", err.message);
  }
}

export default connectDB;