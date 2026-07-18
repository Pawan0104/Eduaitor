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
  getBusesGps,
  createBus,
  updateBus,
  updateBusStatus,
  updateBusGps,
  recordBusTripEvent,
  getSchoolTransportLocation,
  updateSchoolTransportLocation,
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
  getParentTransport,
} from "../controllers/transportController.js";
import { authMiddleware } from "../auth/auth.js";
import checkModuleAccess from "../middlewares/checkModuleAccess.js";
import School from "../models/school.js";

const router = express.Router();
const transportGuard = [authMiddleware, checkModuleAccess("transport")];

/** GPS endpoints: school must have transport or gpsTracking subscribed */
const gpsGuard = [
  authMiddleware,
  async (req, res, next) => {
    try {
      if (req.user?.role === "super_admin") return next();
      const schoolId = req.user?.school_id;
      if (!schoolId) {
        return res.status(403).json({
          success: false,
          message: "School not identified. Access denied.",
        });
      }
      const school = await School.findById(schoolId).select(
        "subscribed_modules status",
      );
      if (!school) {
        return res
          .status(403)
          .json({ success: false, message: "School not found. Access denied." });
      }
      if (school.status === "Inactive") {
        return res.status(403).json({
          success: false,
          message: "Your school account is inactive. Contact administrator.",
        });
      }
      const mods = school.subscribed_modules || [];
      if (!mods.includes("transport") && !mods.includes("gpsTracking")) {
        return res.status(403).json({
          success: false,
          message:
            "Your school has not subscribed to Transport or Bus GPS Tracking. Please upgrade your plan.",
        });
      }
      return next();
    } catch {
      return res.status(500).json({
        success: false,
        message: "Module access check failed.",
      });
    }
  },
];

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
router.get("/summary", ...transportGuard, getSummary);

// GET  /transport/activity?school_id=
router.get("/activity", ...transportGuard, getActivity);

// ── DRIVERS ───────────────────────────────────────────────────────────────────

// GET    /transport/drivers
router.get("/drivers", ...transportGuard, getDrivers);

// POST   /transport/drivers           body: { school_id, name, phone, ... }
router.post("/drivers", ...transportGuard, createDriver);

// PUT    /transport/drivers/:id        body: { school_id, ...fields }
router.put("/drivers/:id", ...transportGuard, updateDriver);

// PATCH  /transport/drivers/:id/status body: { school_id, status }
router.patch("/drivers/:id/status", ...transportGuard, updateDriverStatus);

// DELETE /transport/drivers/:id        query: ?school_id=
router.delete("/drivers/:id", ...transportGuard, deleteDriver);

// ── BUSES ─────────────────────────────────────────────────────────────────────

router.get("/buses/gps", ...gpsGuard, getBusesGps);

// School campus location for arrive/depart geofence
router.get("/school-location", ...gpsGuard, getSchoolTransportLocation);
router.put("/school-location", ...gpsGuard, updateSchoolTransportLocation);

// Daily trip parent notifications: pickup → school arrive → school depart → home
router.post("/buses/:id/trip-event", ...gpsGuard, recordBusTripEvent);

// GET    /transport/buses
router.get("/buses", ...transportGuard, getBuses);

// POST   /transport/buses              body: { school_id, id, regNo, ... }
router.post("/buses", ...transportGuard, createBus);

// PUT    /transport/buses/:id          body: { school_id, ...fields }
router.put("/buses/:id", ...transportGuard, updateBus);

// PATCH  /transport/buses/:id/status   body: { school_id, status }
router.patch("/buses/:id/status", ...transportGuard, updateBusStatus);

// PATCH  /transport/buses/:id/gps
router.patch("/buses/:id/gps", ...gpsGuard, updateBusGps);

// DELETE /transport/buses/:id          query: ?school_id=
router.delete("/buses/:id", ...transportGuard, deleteBus);

// ── ROUTES ────────────────────────────────────────────────────────────────────

// GET    /transport/routes
router.get("/routes", ...transportGuard, getRoutes);

// POST   /transport/routes             body: { school_id, name, bus, driver, ... }
router.post("/routes", ...transportGuard, createRoute);

// PUT    /transport/routes/:id         body: { school_id, ...fields }
router.put("/routes/:id", ...transportGuard, updateRoute);

// PATCH  /transport/routes/:id/status  body: { school_id, status }
router.patch("/routes/:id/status", ...transportGuard, updateRouteStatus);

// DELETE /transport/routes/:id         query: ?school_id=
router.delete("/routes/:id", ...transportGuard, deleteRoute);

export default router;
