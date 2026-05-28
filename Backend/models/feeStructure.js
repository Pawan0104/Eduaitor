import mongoose from "mongoose";

const feeStructureSchema = new mongoose.Schema({
   class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Class",
    required: true
  },
 fees: [{
    name: { type: String, required: true }, 
    amount: { type: Number, required: true ,min: [0, "Amount cannot be negative"]},
    isOptional: { type: Boolean, default: false }
  }],
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true
  },
},
  {timestamps:true});

export default mongoose.model("FeeStructure", feeStructureSchema);