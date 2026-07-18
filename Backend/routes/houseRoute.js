import express from "express";
import { authMiddleware } from "../auth/auth.js";
import checkModuleAccess from "../middlewares/checkModuleAccess.js";
import {
  getHouses,
  createHouse,
  updateHouse,
  deleteHouse,
  getHouseStudents,
  assignStudentHouse,
  randomAllocateHouses,
} from "../controllers/houseController.js";

const router = express.Router();
const guard = [authMiddleware, checkModuleAccess("house")];

router.get("/students", ...guard, getHouseStudents);
router.post("/assign", ...guard, assignStudentHouse);
router.post("/allocate-random", ...guard, randomAllocateHouses);

router.get("/", ...guard, getHouses);
router.post("/", ...guard, createHouse);
router.put("/:id", ...guard, updateHouse);
router.delete("/:id", ...guard, deleteHouse);

export default router;
