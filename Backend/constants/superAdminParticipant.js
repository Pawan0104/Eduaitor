import mongoose from "mongoose";

/** Fixed participant id for platform Super Admin in help/support threads */
export const SUPER_ADMIN_PARTICIPANT_ID = new mongoose.Types.ObjectId(
  "000000000000000000000001",
);

export const SUPER_ADMIN_PARTICIPANT_ID_STR =
  SUPER_ADMIN_PARTICIPANT_ID.toString();
