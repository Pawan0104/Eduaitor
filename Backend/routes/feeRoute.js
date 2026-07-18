import express from "express";
import {
  getFeeStructures,
  addFeeComponent,
  editFeeComponent,
  deleteFeeComponent,
  collectStudentFee,
  AllStudentHistory,
  getAllDefaulter,
  getAllAdminDefaulter,
  getAllStudentAdminHistory,
  getMyFeeDetails,
  initiateRazorpayOrder,
  verifyRazorpayPayment,
  getFeeReceipt,
  getFinancialReport,
} from "../controllers/feeController.js";
import { authMiddleware } from "../auth/auth.js";

const router = express.Router();

/***************** FEE STRUCTURE ROUTES *****************/

// router.post("/", createFeeStructure);
// router.get("/:classId", getFeeStructures);

// SUPER ADMIN ROUTES
router.get("/defaulters/admin", authMiddleware, getAllAdminDefaulter);
router.get("/admin", authMiddleware, getAllStudentAdminHistory);

// fee collect routes
router.post("/razorpay/order", authMiddleware, initiateRazorpayOrder);
router.post("/razorpay/verify", authMiddleware, verifyRazorpayPayment);
router.post("/", authMiddleware, collectStudentFee);

// fetch all student history
router.get("/", authMiddleware, AllStudentHistory);

//  fee details for student
// GET /api/fees/parent/student/me
router.get("/parent/student/me", authMiddleware, getMyFeeDetails);

// Receipt + financial reports (must be before /:classId)
router.get("/receipt/:paymentId", authMiddleware, getFeeReceipt);
router.get("/financial-report", authMiddleware, getFinancialReport);

// fetch all defaulter
router.get("/defaulters", authMiddleware, getAllDefaulter);

router.get("/:classId", authMiddleware, getFeeStructures);
router.post("/:classId/fee", authMiddleware, addFeeComponent);
router.put("/:classId/fee/:feeId", authMiddleware, editFeeComponent);
router.delete("/:classId/fee/:feeId", authMiddleware, deleteFeeComponent);
export default router;
