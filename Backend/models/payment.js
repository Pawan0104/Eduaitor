import mongoose from "mongoose";
const paymentSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    // 1. Remove 'unique: true' from here
    receiptNo: { type: String, required: true }, 
    amountPaid: { type: Number, required: true },
    paymentMode: { type: String, enum: ['Cash', 'UPI', 'Cheque', 'Online'], required: true },
    paidDate: { type: Date, default: Date.now },
    remarks: { type: String },
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true
    },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
}, {
    // This tells Mongoose to auto-build indexes properly when the app boots up
    autoIndex: true 
});

// 2. Add this COMPOUND index at the bottom
// This allows RCP-1 for School A and RCP-1 for School B
paymentSchema.index({ receiptNo: 1, schoolId: 1 }, { unique: true });

export default mongoose.model("Payment", paymentSchema);