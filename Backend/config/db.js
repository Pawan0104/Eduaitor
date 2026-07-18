import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { MongoMemoryServer } from "mongodb-memory-server";
import { resolveSrv, resolveTxt } from "dns/promises";
import { URL } from "url";
import { startNotificationCron } from "../cron/notificationCron.js";
import { seedSampleData } from "../utils/seedSampleData.js";

let memoryServer = null;

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

      try {
        const conn = await mongoose.connect(atlasUri, {
          serverSelectionTimeoutMS: 15000,
        });
        console.log("MongoDB Connected Successfully (Atlas)");
        startNotificationCron();
        return conn;
      } catch (primaryError) {
        // Retry direct SRV once for transient DNS/network hiccups.
        try {
          const retryConn = await mongoose.connect(atlasUri, {
            serverSelectionTimeoutMS: 15000,
          });
          console.warn(
            "MongoDB Atlas connected on retry after initial error:",
            primaryError.message,
          );
          startNotificationCron();
          return retryConn;
        } catch (retryError) {
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
          startNotificationCron();
          return conn;
        }
      }
    }

    console.warn("Using in-memory MongoDB for local development...");

    if (!memoryServer) {
      memoryServer = await MongoMemoryServer.create();
    }

    await mongoose.connect(memoryServer.getUri(), {
      dbName: "EduaitorLocal",
    });

    await seedSampleData();
    console.log("MongoDB Connected Successfully (in-memory fallback)");
    startNotificationCron();
    return mongoose.connection;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
};

export default connectDB;