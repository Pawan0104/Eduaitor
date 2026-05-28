import mongoose from "mongoose";
const IssueSchema = new mongoose.Schema({
  schoolId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'School', 
    required: true 
  },
  bookId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Book', 
    required: true 
  },
  studentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Student', // Refers to your Student model
    required: true 
  },
  issueDate: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  returnDate: { type: Date },
  fineAmount: { type: Number, default: 0 },
  finePaid: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['Issued', 'Returned', 'Overdue'], 
    default: 'Issued' 
  }
}, { timestamps: true });

IssueSchema.index({ schoolId: 1, studentId: 1, bookId: 1, status: 1 });
IssueSchema.index({ schoolId: 1, status: 1, dueDate: 1 });

export default mongoose.model('Issue', IssueSchema);
