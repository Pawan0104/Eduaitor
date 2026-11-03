import express from "express";
import {
  getPublicRegistrationForm,
  submitPublicRegistration,
} from "../controllers/publicRegistrationController.js";

const router = express.Router();

router.get("/registration/:token", getPublicRegistrationForm);
router.post("/registration/:token", submitPublicRegistration);

export default router;
