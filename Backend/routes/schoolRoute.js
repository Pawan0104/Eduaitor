import express from "express";

import {
createSchool,
getSchools,
getSchool,
updateSchool,
deleteSchool
} from "../controllers/schoolController.js";

const router = express.Router();

/* ROUTES */

router.post("/",createSchool);

router.get("/",getSchools);

router.get("/:id",getSchool);

router.put("/:id",updateSchool);

router.delete("/:id",deleteSchool);

export default router;