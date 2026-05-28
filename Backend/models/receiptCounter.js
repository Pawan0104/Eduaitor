// models/Counter.js
import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
 _id: { type: String, required: true }, // Will be "receiptNo_SCHOOLID"
  seq: { type: Number, default: 1000 },
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School" }
});

export default mongoose.model("Counter", counterSchema);