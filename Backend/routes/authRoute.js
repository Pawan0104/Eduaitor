import express from "express";
import {
  loginUser,
  changePassWord,
  dismissPasswordPrompt,
  updateStudentPasswordByParent,
  lookupParentSchools,
  getParentChildren,
  switchParentChild,
} from "../controllers/authController.js";
import {
  forgotPassword,
  resetPassword,
} from "../controllers/passwordResetController.js";
import { authMiddleware } from "../auth/auth.js";

const router = express.Router();

router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/parent/lookup", lookupParentSchools);
router.post("/change-password", authMiddleware, changePassWord);
router.post("/dismiss-password-prompt", authMiddleware, dismissPasswordPrompt);
router.post(
  "/parent/student-password",
  authMiddleware,
  updateStudentPasswordByParent,
);
router.get("/parent/children", authMiddleware, getParentChildren);
router.post("/parent/switch-child", authMiddleware, switchParentChild);

export default router;
