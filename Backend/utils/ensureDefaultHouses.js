import House, { DEFAULT_HOUSES } from "../models/house.js";

/** Ensure a school has the 4 starter houses (idempotent). */
export async function ensureDefaultHouses(schoolId) {
  if (!schoolId) return [];

  const existingCount = await House.countDocuments({ schoolId });
  if (existingCount > 0) {
    return House.find({ schoolId }).sort({ createdAt: 1 }).lean();
  }

  await House.insertMany(
    DEFAULT_HOUSES.map((h) => ({
      schoolId,
      name: h.name,
      code: h.code,
      color: h.color,
      isDefault: true,
      status: "Active",
    })),
  );

  return House.find({ schoolId }).sort({ createdAt: 1 }).lean();
}
