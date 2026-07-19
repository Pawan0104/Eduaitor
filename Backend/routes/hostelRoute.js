import express from "express";
import { authMiddleware } from "../auth/auth.js";
import checkModuleAccess from "../middlewares/checkModuleAccess.js";
import upload from "../middlewares/upload.js";
import {
  getHostels,
  getHostel,
  createHostel,
  updateHostel,
  deleteHostel,
} from "../controllers/hostelController.js";
import {
  getRooms,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom,
} from "../controllers/hostelRoomController.js";
import {
  getResidents,
  createResident,
  updateResident,
  checkoutResident,
  deleteResident,
} from "../controllers/hostelResidentController.js";
import {
  getVisitors,
  createVisitor,
  updateVisitor,
  approveVisitor,
  rejectVisitor,
  checkoutVisitor,
  deleteVisitor,
} from "../controllers/hostelVisitorController.js";

const router = express.Router();
const guard = [authMiddleware, checkModuleAccess("hostel")];
const visitorPhotoUpload = upload.single("photo");

/* Nested resources before /:id */
router.get("/rooms", ...guard, getRooms);
router.get("/rooms/:id", ...guard, getRoom);
router.post("/rooms", ...guard, createRoom);
router.put("/rooms/:id", ...guard, updateRoom);
router.delete("/rooms/:id", ...guard, deleteRoom);

router.get("/residents", ...guard, getResidents);
router.post("/residents", ...guard, createResident);
router.put("/residents/:id", ...guard, updateResident);
router.post("/residents/:id/checkout", ...guard, checkoutResident);
router.delete("/residents/:id", ...guard, deleteResident);

router.get("/visitors", ...guard, getVisitors);
router.post("/visitors", ...guard, visitorPhotoUpload, createVisitor);
router.put("/visitors/:id", ...guard, visitorPhotoUpload, updateVisitor);
router.post("/visitors/:id/approve", ...guard, approveVisitor);
router.post("/visitors/:id/reject", ...guard, rejectVisitor);
router.post("/visitors/:id/checkout", ...guard, checkoutVisitor);
router.delete("/visitors/:id", ...guard, deleteVisitor);

router.get("/", ...guard, getHostels);
router.get("/:id", ...guard, getHostel);
router.post("/", ...guard, createHostel);
router.put("/:id", ...guard, updateHostel);
router.delete("/:id", ...guard, deleteHostel);

export default router;
