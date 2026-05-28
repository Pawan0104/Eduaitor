import express from "express";
import {
  // Dashboard
  getSummary,
  getActivity,

  // Drivers
  getDrivers,
  createDriver,
  updateDriver,
  updateDriverStatus,
  deleteDriver,

  // Buses
  getBuses,
  createBus,
  updateBus,
  updateBusStatus,
  deleteBus,

  // Routes
  getRoutes,
  createRoute,
  updateRoute,
  updateRouteStatus,
  deleteRoute,

  // Super Admin
  getAdminDrivers,
  getAdminBuses,
  getAdminRoutes,
  getAdminSummary,

  // Parent
  getParentTransport
} from "../controllers/transportController.js";
import { authMiddleware } from "../auth/auth.js";

const router = express.Router();

// ── PARENT ────────────────────────────────────────────────────────────────
router.get("/parent/my-route", authMiddleware, getParentTransport);

// ── SUPER ADMIN ────────────────────────────────────────────────────────────────

// GET    /transport/drivers/admin?school_id=
router.get("/drivers/admin", authMiddleware, getAdminDrivers);

// GET    /transport/buses/admin?school_id=
router.get("/buses/admin", authMiddleware, getAdminBuses);

// GET    /transport/routes/admin?school_id=
router.get("/routes/admin", authMiddleware, getAdminRoutes);

// GET  /transport/summary/admin?school_id=
router.get("/summary/admin", authMiddleware, getAdminSummary);

// ── DASHBOARD ─────────────────────────────────────────────────────────────────

// GET  /transport/summary
router.get("/summary", authMiddleware, getSummary);

// GET  /transport/activity?school_id=
router.get("/activity", authMiddleware, getActivity);

// ── DRIVERS ───────────────────────────────────────────────────────────────────

// GET    /transport/drivers
router.get("/drivers", authMiddleware, getDrivers);

// POST   /transport/drivers           body: { school_id, name, phone, ... }
router.post("/drivers", authMiddleware, createDriver);

// PUT    /transport/drivers/:id        body: { school_id, ...fields }
router.put("/drivers/:id", authMiddleware, updateDriver);

// PATCH  /transport/drivers/:id/status body: { school_id, status }
router.patch("/drivers/:id/status", authMiddleware, updateDriverStatus);

// DELETE /transport/drivers/:id        query: ?school_id=
router.delete("/drivers/:id", authMiddleware, deleteDriver);

// ── BUSES ─────────────────────────────────────────────────────────────────────

// GET    /transport/buses
router.get("/buses", authMiddleware, getBuses);

// POST   /transport/buses              body: { school_id, id, regNo, ... }
router.post("/buses", authMiddleware, createBus);

// PUT    /transport/buses/:id          body: { school_id, ...fields }
router.put("/buses/:id", authMiddleware, updateBus);

// PATCH  /transport/buses/:id/status   body: { school_id, status }
router.patch("/buses/:id/status", updateBusStatus);

// DELETE /transport/buses/:id          query: ?school_id=
router.delete("/buses/:id", authMiddleware, deleteBus);

// ── ROUTES ────────────────────────────────────────────────────────────────────

// GET    /transport/routes
router.get("/routes", authMiddleware, getRoutes);

// POST   /transport/routes             body: { school_id, name, bus, driver, ... }
router.post("/routes", authMiddleware, createRoute);

// PUT    /transport/routes/:id         body: { school_id, ...fields }
router.put("/routes/:id", authMiddleware, updateRoute);

// PATCH  /transport/routes/:id/status  body: { school_id, status }
router.patch("/routes/:id/status", authMiddleware, updateRouteStatus);

// DELETE /transport/routes/:id         query: ?school_id=
router.delete("/routes/:id", authMiddleware, deleteRoute);

export default router;
