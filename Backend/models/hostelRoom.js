import mongoose from "mongoose";

const bedSchema = new mongoose.Schema(
  {
    bedNumber: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Available", "Occupied", "Maintenance"],
      default: "Available",
    },
  },
  { _id: true }
);

const hostelRoomSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    hostelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      required: true,
      index: true,
    },
    roomNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    floor: {
      type: Number,
      min: 0,
      default: 1,
    },
    roomType: {
      type: String,
      enum: ["Single", "Double", "Triple", "Quad", "Dormitory"],
      default: "Double",
    },
    beds: {
      type: [bedSchema],
      default: [],
    },
    amenities: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Maintenance"],
      default: "Active",
    },
  },
  { timestamps: true }
);

hostelRoomSchema.virtual("totalBeds").get(function () {
  return this.beds?.length || 0;
});

hostelRoomSchema.virtual("availableBeds").get(function () {
  return (this.beds || []).filter((b) => b.status === "Available").length;
});

hostelRoomSchema.set("toJSON", { virtuals: true });
hostelRoomSchema.set("toObject", { virtuals: true });

hostelRoomSchema.index(
  { schoolId: 1, hostelId: 1, roomNumber: 1 },
  { unique: true }
);

export default mongoose.model("HostelRoom", hostelRoomSchema);
