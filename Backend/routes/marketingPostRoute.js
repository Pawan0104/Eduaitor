import express from "express";
import {
  marketingAccess,
  resolveSchoolIdForSuperAdmin,
} from "../middlewares/marketingPermission.js";
import {
  getDashboard,
  listPosts,
  getPost,
  generatePost,
  generateAllFromEntity,
  runAutopilot,
  getAutopilotStatus,
  previewWebsite,
  approveAndPublish,
  createManualPost,
  editPost,
  submitPost,
  approvePost,
  rejectPost,
  schedulePost,
  publishNow,
  retryPost,
  discardPost,
} from "../controllers/marketing/postController.js";

const router = express.Router();

router.use(marketingAccess);
router.use(resolveSchoolIdForSuperAdmin);

router.get("/dashboard", getDashboard);
router.get("/posts", listPosts);
router.post("/posts/generate", generatePost);
router.post("/posts/generate-entity", generateAllFromEntity);
router.post("/posts/autopilot-run", runAutopilot);
router.get("/posts/autopilot-status", getAutopilotStatus);
router.get("/posts/website-preview", previewWebsite);
router.post("/posts/:id/approve-and-publish", approveAndPublish);
router.post("/posts", createManualPost);
router.get("/posts/:id", getPost);
router.put("/posts/:id", editPost);
router.post("/posts/:id/submit", submitPost);
router.post("/posts/:id/approve", approvePost);
router.post("/posts/:id/reject", rejectPost);
router.post("/posts/:id/schedule", schedulePost);
router.post("/posts/:id/publish-now", publishNow);
router.post("/posts/:id/retry", retryPost);
router.delete("/posts/:id", discardPost);

export default router;