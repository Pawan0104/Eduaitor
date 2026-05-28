import express from "express";
import { loginUser, changePassWord } from "../controllers/authController.js";
import { authMiddleware } from "../auth/auth.js";
const router = express.Router();

router.post("/login", loginUser);
router.post("/change-password", authMiddleware, changePassWord)
// router.put("/change-password", authMiddleware, changePassWord)

export default router;