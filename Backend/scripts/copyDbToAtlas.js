import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config({ path: "./.env" });

const sourceUri = process.env.SOURCE_MONGO_URI;
const targetUri = process.env.MONGO_URI;
const sourceDbName = process.env.SOURCE_DB_NAME || "EduaitorLocal";
const targetDbName = process.env.TARGET_DB_NAME || "Eduaitor";

if (!sourceUri) {
  console.error("Missing SOURCE_MONGO_URI in environment.");
  process.exit(1);
}

if (!targetUri) {
  console.error("Missing MONGO_URI in environment.");
  process.exit(1);
}

const copyCollection = async (sourceDb, targetDb, name) => {
  const sourceCol = sourceDb.collection(name);
  const targetCol = targetDb.collection(name);

  const docs = await sourceCol.find({}).toArray();
  await targetCol.deleteMany({});

  if (docs.length > 0) {
    await targetCol.insertMany(docs, { ordered: false });
  }

  return docs.length;
};

const run = async () => {
  const sourceClient = new MongoClient(sourceUri);
  const targetClient = new MongoClient(targetUri);

  try {
    await sourceClient.connect();
    await targetClient.connect();

    const sourceDb = sourceClient.db(sourceDbName);
    const targetDb = targetClient.db(targetDbName);

    const collections = await sourceDb.listCollections().toArray();
    if (collections.length === 0) {
      console.log(`No collections found in source DB: ${sourceDbName}`);
      return;
    }

    let totalDocs = 0;

    for (const col of collections) {
      const count = await copyCollection(sourceDb, targetDb, col.name);
      totalDocs += count;
      console.log(`Copied ${count} docs from ${col.name}`);
    }

    console.log(`Done. Copied ${totalDocs} total documents from ${sourceDbName} to ${targetDbName}.`);
  } finally {
    await sourceClient.close();
    await targetClient.close();
  }
};

run().catch((error) => {
  console.error("Migration failed:", error.message);
  process.exit(1);
});
