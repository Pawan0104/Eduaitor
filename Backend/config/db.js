import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import net from "net";
import { resolveSrv, resolveTxt } from "dns/promises";
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
const runAtlasPreflight = async (uri) => {
  const log = (...args) => console.log(ATLAS_DIAG_TAG, ...args);

  try {
    // Lift credentials for scrubbing before anything can be logged.
    resetAtlasUriSecrets(uri);
    const isSrv = uri.startsWith("mongodb+srv://");
    const parsed = new URL(uri);
    // parsed.username / parsed.password are deliberately never read or logged.
    const hostname = parsed.hostname;
    log(
      `preflight start scheme=${isSrv ? "mongodb+srv" : "mongodb"} host=${hostname}`,
    );

    let targets = [];
    if (isSrv) {
      const records = await resolveSrv(`_mongodb._tcp.${hostname}`);
      targets = records.map((r) => ({ host: r.name, port: r.port || 27017 }));
      log(`SRV lookup _mongodb._tcp.${hostname} -> ${targets.length} record(s)`);
    } else {
      targets = parsed.host.split(",").map((entry) => {
        const [h, p] = entry.split(":");
        return { host: h, port: Number(p) || 27017 };
      });
      log(`non-SRV URI -> ${targets.length} host(s) parsed from authority`);
    }

    for (const t of targets) {
      log(`resolved host=${t.host} port=${t.port}`);
    }

    for (const t of targets) {
      // Sequential on purpose: parallel probes can look like a burst of
      // abuse to Atlas network filters.
      await new Promise((resolve) => {
        let settled = false;
        const socket = net.connect({ host: t.host, port: t.port });
        const finish = (...args) => {
          if (settled) return;
          settled = true;
          try {
            socket.destroy();
          } catch {
            /* socket already torn down */
          }
          log(...args);
          resolve();
        };
        socket.setTimeout(5000);
        socket.once("connect", () => finish(`TCP OK ${t.host}:${t.port}`));
        socket.once("timeout", () =>
          finish(`TCP TIMEOUT after 5000ms ${t.host}:${t.port}`),
        );
        socket.once("error", (err) =>
          finish(
            `TCP FAIL ${t.host}:${t.port} code=${err.code} name=${err.name} message=${redactAtlasSecrets(err.message)}`,
          ),
        );
      });
    }

    log("preflight complete");
  } catch (err) {
    log(
      `preflight aborted name=${err?.name} code=${err?.code} message=${redactAtlasSecrets(err?.message)}`,
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

      // [ATLAS-DIAGNOSTIC] TEMPORARY - DNS + TCP reachability probe. Runs
      // before the driver so DNS and TCP faults are distinguishable from
      // TLS/auth faults. Does not alter the connect options below.
      await runAtlasPreflight(atlasUri);

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