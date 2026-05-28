import mongoose from "mongoose";
const BookSchema = new mongoose.Schema({
  schoolId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'School', 
    required: true,
    index: true // Speeds up queries when a Principal loads their library
  },
  title: { type: String, required: true, trim: true },
  category:{type:String,required:true, trim: true},
  author: { type: String, required: true, trim: true },
  isbn: { type: String, required: true, trim: true },
  totalCopies: { type: Number, default: 1, min: 1 },
  availableCopies: { type: Number, default: 1, min: 0 },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } 
}, { timestamps: true });

// Ensure ISBN is unique ONLY within the same school
BookSchema.index({ isbn: 1, schoolId: 1 }, { unique: true });

export default mongoose.model('Book', BookSchema);
