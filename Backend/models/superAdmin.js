import mongoose from "mongoose";
import {
  SUPER_ADMIN_PARTICIPANT_ID,
} from "../constants/superAdminParticipant.js";

const superAdminSchema = new mongoose.Schema(
  {
    email: { type: String, default: "" },
    name: { type: String, default: "Platform Support" },
  },
  { timestamps: true },
);

const SuperAdmin =
  mongoose.models.SuperAdmin ||
  mongoose.model("SuperAdmin", superAdminSchema);

/** Ensure the singleton Super Admin participant document exists */
export const ensureSuperAdminParticipant = async () => {
  let doc = await SuperAdmin.findById(SUPER_ADMIN_PARTICIPANT_ID);
  if (!doc) {
    doc = await SuperAdmin.create({
      _id: SUPER_ADMIN_PARTICIPANT_ID,
      email: process.env.SUPER_ADMIN_EMAIL || "",
      name: "Platform Support",
    });
  }
  return doc;
};

export default SuperAdmin;
