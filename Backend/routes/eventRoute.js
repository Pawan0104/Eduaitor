import express from "express";
import {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getAllAdminEvents,
} from "../controllers/eventController.js";
import { authMiddleware } from "../auth/auth.js";

const router = express.Router();

// SUPER ADMIN ROUTES
router.get("/all/admin",authMiddleware, getAllAdminEvents);

// EVENT ROUTES
router.get("/", authMiddleware, getAllEvents);
router.post("/create", authMiddleware, createEvent);
router.get("/detail/:id", getEventById);
router.put("/:id", authMiddleware,updateEvent);
router.delete("/:id", deleteEvent);

export default router;
