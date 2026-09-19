import express from "express";
import {
  marketingAccess,
  resolveSchoolIdForSuperAdmin,
} from "../middlewares/marketingPermission.js";
import {
  getAccounts,
  connectAccount,
  updateToken,
  testAccountEndpoint,
  disconnectAccountEndpoint,
  oauthConnectUrl,
} from "../controllers/marketing/accountController.js";

const router = express.Router();

router.use(marketingAccess);
router.use(resolveSchoolIdForSuperAdmin);

router.get("/", getAccounts);
router.post("/connect", connectAccount);
router.get("/connect-url", oauthConnectUrl);
router.post("/:id/token", updateToken);
router.post("/:id/test", testAccountEndpoint);
router.post("/:id/disconnect", disconnectAccountEndpoint);

export default router;