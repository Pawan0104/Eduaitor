import express from "express";
import {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  bulkCreateEvents,
} from "../controllers/calendarController.js";
import { authMiddleware } from "../auth/auth.js";

const router = express.Router();

// All calendar routes require authentication
router.use(authMiddleware);

router.post("/", createEvent); // POST   /calendar/
router.post("/bulk", bulkCreateEvents); // POST   /calendar/bulk
router.get("/", getEvents); // GET    /calendar/?start=&end=&schoolId=&type=&academicYearId=
router.get("/:id", getEventById); // GET    /calendar/:id
router.put("/:id", updateEvent); // PUT    /calendar/:id
router.delete("/:id", deleteEvent); // DELETE /calendar/:id

export default router;
