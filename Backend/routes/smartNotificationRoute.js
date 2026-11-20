import express from "express";
import { authMiddleware } from "../auth/auth.js";
import {
  getOverview,
  getEvents,
  patchEvent,
  getTemplate,
  putTemplate,
  testTemplate,
  getHistory,
  getHistoryDetail,
  getChannels,
  patchChannels,
  getPreferences,
  patchPreferences,
  sendBroadcast,
} from "../controllers/smartNotificationController.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/overview", getOverview);
router.get("/events", getEvents);
router.patch("/events/:eventType", patchEvent);

router.get("/templates/:eventType", getTemplate);
router.put("/templates/:eventType", putTemplate);
router.post("/templates/:eventType/test", testTemplate);

router.get("/history", getHistory);
router.get("/history/:jobId", getHistoryDetail);

router.get("/channels", getChannels);
router.patch("/channels", patchChannels);

router.get("/preferences", getPreferences);
router.patch("/preferences", patchPreferences);

router.post("/broadcast", sendBroadcast);

export default router;
