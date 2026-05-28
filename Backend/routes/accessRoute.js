import express from "express";

import {
createAccess,
getAccess,
updateAccess,
deleteAccess
} from "../controllers/accessController.js";

const router = express.Router();

/* ACCESS ROUTES */

router.post("/",createAccess);

router.get("/",getAccess);

router.put("/:id",updateAccess);

router.delete("/:id",deleteAccess);

export default router;