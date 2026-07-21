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
import { authMiddleware, requireRoles } from "../auth/auth.js";
import checkModuleAccess from "../middlewares/checkModuleAccess.js";

const router = express.Router();

const schoolOrStaffFees = [
  authMiddleware,
  requireRoles("school_admin", "staff_admin"),
  checkModuleAccess("fees"),
];
const superAdminOnly = [authMiddleware, requireRoles("super_admin")];

/***************** FEE STRUCTURE ROUTES *****************/

// SUPER ADMIN ROUTES
router.get("/defaulters/admin", ...superAdminOnly, getAllAdminDefaulter);
router.get("/admin", ...superAdminOnly, getAllStudentAdminHistory);

// fee collect routes
router.post("/razorpay/order", authMiddleware, initiateRazorpayOrder);
router.post("/razorpay/verify", authMiddleware, verifyRazorpayPayment);
router.post("/", ...schoolOrStaffFees, collectStudentFee);

// fetch all student history
router.get("/", ...schoolOrStaffFees, AllStudentHistory);

// fee details for student / parent
router.get("/parent/student/me", authMiddleware, getMyFeeDetails);

// Receipt + financial reports (must be before /:classId)
router.get("/receipt/:paymentId", authMiddleware, getFeeReceipt);
router.get("/financial-report", ...schoolOrStaffFees, getFinancialReport);

// fetch all defaulter
router.get("/defaulters", ...schoolOrStaffFees, getAllDefaulter);

// Fee structure setup — school/staff with fees module only
router.get("/:classId", ...schoolOrStaffFees, getFeeStructures);
router.post("/:classId/fee", ...schoolOrStaffFees, addFeeComponent);
router.put("/:classId/fee/:feeId", ...schoolOrStaffFees, editFeeComponent);
router.delete("/:classId/fee/:feeId", ...schoolOrStaffFees, deleteFeeComponent);

export default router;
