import express from "express";

import {
createSubscription,
getSubscriptions,
getSubscription,
updateSubscription,
deleteSubscription
} from "../controllers/subscriptionController.js";

const router = express.Router();

/* ROUTES */

router.post("/",createSubscription);

router.get("/",getSubscriptions);

router.get("/:id",getSubscription);

router.put("/:id",updateSubscription);

router.delete("/:id",deleteSubscription);

export default router;