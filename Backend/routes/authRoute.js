import express from "express";
import {
  loginUser,
  changePassWord,
  getParentChildren,
  switchParentChild,
} from "../controllers/authController.js";
import { authMiddleware } from "../auth/auth.js";

const router = express.Router();

router.post("/login", loginUser);
router.post("/change-password", authMiddleware, changePassWord);
router.get("/parent/children", authMiddleware, getParentChildren);
router.post("/parent/switch-child", authMiddleware, switchParentChild);

export default router;
