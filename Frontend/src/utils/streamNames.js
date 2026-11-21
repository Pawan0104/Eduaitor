export const SUGGESTED_STREAM_NAMES = [
  "Science",
  "Commerce",
  "Arts",
  "Agriculture",
  "Sanskrit Sahitya",
];

/**
 * Build the canonical, de-duplicated list of stream names from school stream
 * records. This is the single source of truth used by the Add New Class
 * modals so that created/deleted streams stay in sync with the backend.
 */
export const getSchoolStreamNames = (streams = []) => {
  const byKey = new Map();
  for (const stream of streams) {
    const name = String(stream?.name || "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (!byKey.has(key)) byKey.set(key, name);
  }
  return [...byKey.values()].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
  );
};

/**
 * Resolve a class's streamIds (which may be raw IDs or populated objects) into
 * full school stream records so dropdowns can show the stream name instead of
 * the MongoDB ObjectId.
 */
export const resolveClassStreams = (classStreamIds = [], schoolStreams = []) => {
  const byId = new Map(
    schoolStreams
      .filter((stream) => stream?._id)
      .map((stream) => [String(stream._id), stream]),
  );

  return classStreamIds.map((entry) => {
    if (entry && typeof entry === "object") {
      const id = String(entry._id || entry.id || "");
      return byId.get(id) || entry;
    }
    return byId.get(String(entry)) || { _id: entry, name: String(entry) };
  });
};
