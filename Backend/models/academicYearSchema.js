const academicYearSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    name: {
      type: String, // "2025-26"
      required: true,
    },
    startDate: Date,
    endDate: Date,
    isActive: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);
