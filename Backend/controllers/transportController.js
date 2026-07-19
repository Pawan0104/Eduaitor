import mongoose from "mongoose";
import Student from "../models/student.js";
import School from "../models/school.js";
import { Driver, Bus, TransportRoute, Activity } from "../models/transport.js";
import { createNotificationHelper } from "./notificationController.js";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";

// ── HELPERS ───────────────────────────────────────────────────────────────────

const toId = (id) => new mongoose.Types.ObjectId(id);

const getUploadedFile = (req, field) => {
  const files = req.files;
  if (!files) return null;
  if (Array.isArray(files)) {
    return files.find((f) => f.fieldname === field) || null;
  }
  return files[field]?.[0] || null;
};

const uploadDriverDoc = async (req, field, folder) => {
  const file = getUploadedFile(req, field);
  if (!file) return null;
  const uploaded = await uploadToCloudinary(file, folder);
  return {
    url: uploaded.url,
    public_id: uploaded.public_id,
    type: uploaded.type || file.mimetype,
  };
};

const notFound = (res, entity = "Record") =>
  res.status(404).json({ success: false, message: `${entity} not found` });

const serverError = (res, err) => {
  console.error(err);
  res.status(500).json({ success: false, message: "Internal server error" });
};

const missingSchoolId = (res) =>
  res.status(400).json({ success: false, message: "school_id is required" });

// Safe ObjectId resolver — returns ObjectId if valid string, else null
const resolveId = (val) =>
  val && mongoose.isValidObjectId(val) ? toId(val) : null;

const TRIP_EVENTS = [
  "pickup",
  "arrive_school",
  "depart_school",
  "arrive_home",
];

const TRIP_EVENT_META = {
  pickup: {
    field: "pickup",
    title: "Bus Pickup 🚌",
    message: (busLabel, routeName) =>
      `Your child's school bus (${busLabel}) has started pickup${
        routeName ? ` on route ${routeName}` : ""
      }. Please have your child ready at the stop.`,
  },
  arrive_school: {
    field: "arriveSchool",
    title: "Arrived at School 🏫",
    message: (busLabel, routeName) =>
      `Your child's school bus (${busLabel}) has arrived at school${
        routeName ? ` (${routeName})` : ""
      }.`,
  },
  depart_school: {
    field: "departSchool",
    title: "Departed from School 🚌",
    message: (busLabel, routeName) =>
      `Your child's school bus (${busLabel}) has left school for drop-off${
        routeName ? ` on route ${routeName}` : ""
      }.`,
  },
  arrive_home: {
    field: "arriveHome",
    title: "Arrived Home 🏠",
    message: (busLabel, routeName) =>
      `Your child's school bus (${busLabel}) has completed drop-off / arrived near home${
        routeName ? ` (${routeName})` : ""
      }.`,
  },
};

const todayKey = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const haversineMeters = (lat1, lon1, lat2, lon2) => {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

const ensureTripDay = (bus) => {
  const key = todayKey();
  if (bus.tripDate !== key) {
    bus.tripDate = key;
    bus.tripEvents = {
      pickup: { at: null, notified: false },
      arriveSchool: { at: null, notified: false },
      departSchool: { at: null, notified: false },
      arriveHome: { at: null, notified: false },
    };
    bus.insideSchoolGeofence = false;
  }
  if (!bus.tripEvents) {
    bus.tripEvents = {
      pickup: { at: null, notified: false },
      arriveSchool: { at: null, notified: false },
      departSchool: { at: null, notified: false },
      arriveHome: { at: null, notified: false },
    };
  }
};

const tripEventSnapshot = (bus) => {
  ensureTripDay(bus);
  const e = bus.tripEvents || {};
  return {
    tripDate: bus.tripDate,
    pickup: !!e.pickup?.notified,
    arriveSchool: !!e.arriveSchool?.notified,
    departSchool: !!e.departSchool?.notified,
    arriveHome: !!e.arriveHome?.notified,
    pickupAt: e.pickup?.at || null,
    arriveSchoolAt: e.arriveSchool?.at || null,
    departSchoolAt: e.departSchool?.at || null,
    arriveHomeAt: e.arriveHome?.at || null,
  };
};

/**
 * Record a trip event and notify parents of students on this bus's route.
 * Returns { sent, skipped, reason?, notifiedCount }
 */
const fireTripEvent = async ({
  bus,
  event,
  schoolId,
  createdBy = null,
  source = "manual",
}) => {
  if (!TRIP_EVENTS.includes(event)) {
    return { sent: false, reason: "Invalid trip event" };
  }

  ensureTripDay(bus);
  const meta = TRIP_EVENT_META[event];
  const field = meta.field;

  if (bus.tripEvents[field]?.notified) {
    return {
      sent: false,
      skipped: true,
      reason: "Already notified for this event today",
      trip: tripEventSnapshot(bus),
    };
  }

  // Soft order: pickup → arrive school → depart school → arrive home
  const order = ["pickup", "arriveSchool", "departSchool", "arriveHome"];
  const idx = order.indexOf(field);
  for (let i = 0; i < idx; i++) {
    if (!bus.tripEvents[order[i]]?.notified) {
      return {
        sent: false,
        reason: `Complete "${order[i]}" before "${field}"`,
        trip: tripEventSnapshot(bus),
      };
    }
  }

  let routeId = bus.route?._id || bus.route;
  let routeName = bus.route?.name || "";
  if (routeId && !routeName) {
    const route = await TransportRoute.findById(routeId).select("name").lean();
    routeName = route?.name || "";
  }

  if (!routeId) {
    return {
      sent: false,
      reason: "Bus has no route assigned",
      trip: tripEventSnapshot(bus),
    };
  }

  const students = await Student.find({
    schoolId: toId(schoolId),
    transport: toId(routeId),
  })
    .select("_id classId sectionId firstName lastName")
    .lean();

  const busLabel = bus.busId || bus.regNo || "School Bus";
  const targets = students.map((s) => ({
    type: "student",
    studentId: s._id,
    classId: s.classId || undefined,
    sectionId: s.sectionId || undefined,
  }));

  if (targets.length > 0) {
    await createNotificationHelper({
      title: meta.title,
      message: meta.message(busLabel, routeName),
      notificationType: "transport",
      createdBy,
      schoolId,
      targets,
    });
  }

  bus.tripEvents[field] = { at: new Date(), notified: true };
  bus.markModified("tripEvents");
  await bus.save();

  await Activity.create({
    schoolId: toId(schoolId),
    bus: bus._id,
    route: routeId,
    driver: bus.driver || null,
    status: `Trip:${event}:${source}`,
    time: new Date().toLocaleTimeString("en-IN"),
    date: new Date(),
  });

  return {
    sent: true,
    skipped: false,
    notifiedCount: targets.length,
    trip: tripEventSnapshot(bus),
  };
};

const maybeAutoSchoolGeofence = async (bus, schoolId, createdBy) => {
  const school = await School.findById(schoolId)
    .select("latitude longitude geofenceRadiusM")
    .lean();
  if (
    school?.latitude == null ||
    school?.longitude == null ||
    bus.lastLatitude == null ||
    bus.lastLongitude == null
  ) {
    return null;
  }

  const radius = Number(school.geofenceRadiusM) || 250;
  const dist = haversineMeters(
    bus.lastLatitude,
    bus.lastLongitude,
    school.latitude,
    school.longitude,
  );
  const inside = dist <= radius;
  const wasInside = !!bus.insideSchoolGeofence;

  ensureTripDay(bus);
  bus.insideSchoolGeofence = inside;

  // Enter school → arrival (only after pickup was notified today)
  if (inside && !wasInside) {
    if (
      bus.tripEvents?.pickup?.notified &&
      !bus.tripEvents?.arriveSchool?.notified
    ) {
      return fireTripEvent({
        bus,
        event: "arrive_school",
        schoolId,
        createdBy,
        source: "gps",
      });
    }
    await bus.save();
    return null;
  }

  // Leave school → departure (only after school arrival was notified)
  if (!inside && wasInside) {
    if (
      bus.tripEvents?.arriveSchool?.notified &&
      !bus.tripEvents?.departSchool?.notified
    ) {
      return fireTripEvent({
        bus,
        event: "depart_school",
        schoolId,
        createdBy,
        source: "gps",
      });
    }
    await bus.save();
    return null;
  }

  await bus.save();
  return null;
};

// ════════════════════════════════════════════════════════════════════════════
// DASHBOARD SUMMARY
// GET /transport/summary?school_id=
// ════════════════════════════════════════════════════════════════════════════

export const getSummary = async (req, res) => {
  try {
    const school_id = req.user?.school_id;
    if (!school_id) return missingSchoolId(res);

    const schoolObjId = toId(school_id);

    const [buses, routes, drivers] = await Promise.all([
      Bus.find({ schoolId: schoolObjId }).lean(),
      TransportRoute.find({ schoolId: schoolObjId }).lean(),
      Driver.find({ schoolId: schoolObjId }).lean(),
    ]);

    const totalStudents = routes.reduce((sum, r) => sum + (r.students || 0), 0);

    res.json({
      success: true,
      buses: buses.length,
      routes: routes.length,
      drivers: drivers.length,
      students: totalStudents,
      maintenance: buses.filter((b) => b.status === "Maintenance").length,
      suspended: routes.filter((r) => r.status === "Suspended").length,
      on_leave: drivers.filter((d) => d.status === "On Leave").length,
    });
  } catch (err) {
    serverError(res, err);
  }
};

// ════════════════════════════════════════════════════════════════════════════
// TODAY'S ACTIVITY
// GET /transport/activity?school_id=
// ════════════════════════════════════════════════════════════════════════════

export const getActivity = async (req, res) => {
  try {
    const school_id = req.user?.school_id;
    if (!school_id) return missingSchoolId(res);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const activity = await Activity.find({
      schoolId: toId(school_id),
      date: { $gte: startOfDay },
    })
      .populate("bus", "busId")
      .populate("route", "name")
      .populate("driver", "name")
      .sort({ date: -1 })
      .lean();

    const data = await Promise.all(
      activity.map(async (a) => {
        let bus = a.bus?.busId;
        let route = a.route?.name;
        let driver = a.driver?.name;

        /* ── BUS FALLBACK ── */
        if (!bus && a.driver) {
          const d = await Driver.findById(a.driver).populate("bus", "busId");
          bus = d?.bus?.busId || "";
        }

        /* ── ROUTE FALLBACK 1: FROM BUS ── */
        if (!route && a.bus) {
          const b = await Bus.findById(a.bus).populate("route", "name");
          route = b?.route?.name || "";
        }

        /* 🔥 ROUTE FALLBACK 2: FROM DRIVER (IMPORTANT FIX) */
        if (!route && a.driver) {
          const d = await Driver.findById(a.driver).populate("route", "name");
          route = d?.route?.name || "";
        }

        return {
          _id: a._id,
          bus: bus || "",
          route: route || "",
          driver: driver || "",
          time: a.time,
          status: a.status,
        };
      }),
    );

    res.json({ success: true, data });
  } catch (err) {
    serverError(res, err);
  }
};

// ════════════════════════════════════════════════════════════════════════════
// DRIVERS
// ════════════════════════════════════════════════════════════════════════════

// GET /transport/drivers?school_id=
export const getDrivers = async (req, res) => {
  try {
    const school_id = req.user?.school_id;
    if (!school_id) return missingSchoolId(res);

    const drivers = await Driver.find({ schoolId: toId(school_id) })
      .populate("bus", "busId regNo")
      .populate("route", "name")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: drivers });
  } catch (err) {
    serverError(res, err);
  }
};

// POST /transport/drivers
// body: { school_id, name, phone, license, licenseExpiry, bus, route, experience }
export const createDriver = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const school_id = req.user?.school_id;
    const {
      name,
      phone,
      license,
      licenseExpiry,
      bus,
      route,
      experience,
      status,
    } = req.body;

    if (!school_id || !name || !phone)
      return res.status(400).json({ message: "Required fields missing" });

    const busId = resolveId(bus);
    const routeId = resolveId(route);

    // 🔥 FIX: add schoolId in conflict check
    if (busId) {
      const existing = await Driver.findOne({
        bus: busId,
        schoolId: toId(school_id),
      });
      if (existing) {
        await session.abortTransaction();
        return res.status(400).json({
          message: "Bus already assigned to another driver",
        });
      }
    }

    if (routeId) {
      const existing = await Driver.findOne({
        route: routeId,
        schoolId: toId(school_id),
      });
      if (existing) {
        await session.abortTransaction();
        return res.status(400).json({
          message: "Route already assigned to another driver",
        });
      }
    }

    const photoUpload = await uploadDriverDoc(req, "photo", "drivers/photo");
    const aadharDoc = await uploadDriverDoc(req, "aadhar", "drivers/aadhar");
    const licenseDoc = await uploadDriverDoc(
      req,
      "licenseDocument",
      "drivers/license",
    );

    const photo = photoUpload
      ? {
          url: photoUpload.url,
          publicId: photoUpload.public_id,
          type: photoUpload.type,
        }
      : undefined;

    const driver = new Driver({
      schoolId: toId(school_id),
      name,
      phone,
      license: license || "",
      licenseExpiry: licenseExpiry || null,
      experience: experience || "",
      bus: busId,
      route: routeId,
      status: req.body.status || "Active",
      ...(photo ? { photo } : {}),
      ...(aadharDoc ? { aadharDoc } : {}),
      ...(licenseDoc ? { licenseDoc } : {}),
    });

    if (req.body.status && req.body.status !== "Active") {
      driver.bus = null;
      driver.route = null;
    }

    await driver.save({ session });

    if (driver.status === "Active") {
      if (busId) {
        await Bus.findByIdAndUpdate(busId, { driver: driver._id }, { session });
      }

      if (routeId) {
        await TransportRoute.findByIdAndUpdate(
          routeId,
          { driver: driver._id },
          { session },
        );
      }
    }

    // Activity
    await Activity.create(
      [
        {
          schoolId: toId(school_id),
          driver: driver._id,
          bus: busId || undefined,
          route: routeId || undefined,
          status: "Driver Assigned",
          time: new Date().toLocaleTimeString(),
        },
      ],
      { session },
    );

    await session.commitTransaction();

    res.status(201).json({ success: true, data: driver });
  } catch (err) {
    await session.abortTransaction();
    console.log(err);
    res.status(500).json({ message: err.message });
  } finally {
    session.endSession();
  }
};

// PUT /transport/drivers/:id
// body: { school_id, name, phone, license, licenseExpiry, bus, route, experience, status }
export const updateDriver = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const school_id = req.user?.school_id;
    const { id } = req.params;
    const { bus, route } = req.body;

    const driver = await Driver.findOne({ _id: id, schoolId: toId(school_id) });

    if (!driver) return res.status(404).json({ message: "Driver not found" });

    const busId = resolveId(bus);
    const routeId = resolveId(route);

    driver.name = req.body.name ?? driver.name;
    driver.phone = req.body.phone ?? driver.phone;
    driver.license = req.body.license ?? driver.license;
    driver.licenseExpiry = req.body.licenseExpiry || null;
    driver.experience = req.body.experience ?? driver.experience;
    driver.status = req.body.status ?? driver.status;

    driver.bus = busId;
    driver.route = routeId;

    const photoUpload = await uploadDriverDoc(req, "photo", "drivers/photo");
    const aadharDoc = await uploadDriverDoc(req, "aadhar", "drivers/aadhar");
    const licenseDoc = await uploadDriverDoc(
      req,
      "licenseDocument",
      "drivers/license",
    );
    if (photoUpload) {
      driver.photo = {
        url: photoUpload.url,
        publicId: photoUpload.public_id,
        type: photoUpload.type,
      };
    }
    if (aadharDoc) driver.aadharDoc = aadharDoc;
    if (licenseDoc) driver.licenseDoc = licenseDoc;

    if (busId) {
      const existing = await Driver.findOne({
        bus: busId,
        schoolId: toId(school_id),
        _id: { $ne: id },
      }).session(session);

      if (existing) {
        await session.abortTransaction();
        return res.status(400).json({
          message: "Bus already assigned",
        });
      }
    }

    if (routeId) {
      const existing = await Driver.findOne({
        route,
        schoolId: toId(school_id),
        _id: { $ne: id },
      }).session(session);

      if (existing) {
        await session.abortTransaction();
        return res.status(400).json({
          message: "Route already assigned",
        });
      }
    }

    // Remove old relations
    await Bus.updateMany(
      { driver: id },
      { $set: { driver: null } },
      { session },
    );

    await TransportRoute.updateMany(
      { driver: id },
      { $set: { driver: null } },
      { session },
    );

    if (driver.status === "Active") {
      if (busId) {
        await Bus.findByIdAndUpdate(bus, { driver: id }, { session });
      }

      if (routeId) {
        await TransportRoute.findByIdAndUpdate(
          route,
          { driver: id },
          { session },
        );
      }
    } else {
      driver.bus = null;
      driver.route = null;
    }

    await driver.save({ session });

    await session.commitTransaction();

    res.json({ success: true, data: driver });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ message: err.message });
  } finally {
    session.endSession();
  }
};

// PATCH /transport/drivers/:id/status
// body: { school_id, status }
export const updateDriverStatus = async (req, res) => {
  try {
    const school_id = req.user?.school_id;
    const { id } = req.params;
    const { status } = req.body;

    if (!school_id) return missingSchoolId(res);
    if (!["Active", "On Leave", "Inactive"].includes(status))
      return res
        .status(400)
        .json({ success: false, message: "Invalid status value" });

    const driver = await Driver.findOneAndUpdate(
      { _id: id, schoolId: toId(school_id) },
      { status },
      { new: true },
    );
    if (!driver) return notFound(res, "Driver");

    res.json({
      success: true,
      message: `Driver marked as ${status}`,
      data: driver,
    });
  } catch (err) {
    serverError(res, err);
  }
};

// DELETE /transport/drivers/:id?school_id=
export const deleteDriver = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const school_id = req.user?.school_id;
    const { id } = req.params;

    const driver = await Driver.findOne({
      _id: id,
      schoolId: toId(school_id),
    }).session(session);

    if (!driver) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Driver not found" });
    }

    const { getDriverDeleteBlocker } = await import(
      "../utils/staffDeleteGuards.js"
    );
    const blocker = await getDriverDeleteBlocker(driver);
    if (blocker) {
      await session.abortTransaction();
      return res.status(409).json({ success: false, message: blocker });
    }

    await Driver.deleteOne({ _id: id, schoolId: toId(school_id) }).session(
      session,
    );

    await Bus.updateMany(
      { driver: id },
      { $set: { driver: null } },
      { session },
    );
    await TransportRoute.updateMany(
      { driver: id },
      { $set: { driver: null } },
      { session },
    );

    await session.commitTransaction();

    res.json({ success: true, message: "Driver deleted" });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ message: err.message });
  } finally {
    session.endSession();
  }
};

// ════════════════════════════════════════════════════════════════════════════
// BUSES
// ════════════════════════════════════════════════════════════════════════════

// GET /transport/buses?school_id=
export const getBuses = async (req, res) => {
  try {
    const school_id = req.user?.school_id;
    if (!school_id) return missingSchoolId(res);

    const buses = await Bus.find({ schoolId: toId(school_id) })
      .populate("driver", "name")
      .populate("route", "name")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: buses });
  } catch (err) {
    serverError(res, err);
  }
};

// POST /transport/buses
// body: { school_id, id (busId), regNo, model, capacity, driver, route, gpsEnabled, gpsDeviceId }
export const createBus = async (req, res) => {
  try {
    const school_id = req.user?.school_id;
    const {
      id: busId,
      regNo,
      model,
      capacity,
      driver,
      route,
      gpsEnabled,
      gpsDeviceId,
      lastLatitude,
      lastLongitude,
    } = req.body;

    if (!school_id) return missingSchoolId(res);

    const bus = await Bus.create({
      schoolId: toId(school_id),
      busId,
      regNo,
      model,
      capacity,
      driver: resolveId(driver),
      route: resolveId(route),
      gpsEnabled: Boolean(gpsEnabled),
      gpsDeviceId: gpsDeviceId ? String(gpsDeviceId).trim() : "",
      lastLatitude:
        lastLatitude !== undefined && lastLatitude !== ""
          ? Number(lastLatitude)
          : null,
      lastLongitude:
        lastLongitude !== undefined && lastLongitude !== ""
          ? Number(lastLongitude)
          : null,
      lastGpsAt:
        lastLatitude !== undefined &&
        lastLatitude !== "" &&
        lastLongitude !== undefined &&
        lastLongitude !== ""
          ? new Date()
          : null,
    });

    // 🔥 FIX: update driver ALSO
    if (driver) {
      await Driver.findByIdAndUpdate(driver, {
        bus: bus._id,
        route: resolveId(route),
      });
    }

    if (route) {
      await TransportRoute.findByIdAndUpdate(route, {
        bus: bus._id,
      });
    }

    res.json({ success: true, data: bus });
  } catch (err) {
    serverError(res, err);
  }
};

// PUT /transport/buses/:id
// body: { school_id, regNo, model, capacity, driver, route, status }
export const updateBus = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const school_id = req.user?.school_id;
    const { id } = req.params;
    const {
      regNo,
      model,
      capacity,
      driver,
      route,
      status,
      id: busId,
      nextService,
      gpsEnabled,
      gpsDeviceId,
      lastLatitude,
      lastLongitude,
      gpsSpeedKmh,
    } = req.body;

    if (!school_id) return missingSchoolId(res);

    const bus = await Bus.findOne({
      _id: id,
      schoolId: toId(school_id),
    }).session(session);

    if (!bus) return notFound(res, "Bus");

    /* ── DRIVER CHECK ── */
    if (driver) {
      const existing = await Bus.findOne({
        driver,
        _id: { $ne: id },
      }).session(session);

      if (existing) {
        await session.abortTransaction();
        return res.status(400).json({
          message: "Driver already assigned to another bus",
        });
      }
    }

    /* ── ROUTE CHECK ── */
    if (route) {
      const existing = await Bus.findOne({
        route,
        _id: { $ne: id },
      }).session(session);

      if (existing) {
        await session.abortTransaction();
        return res.status(400).json({
          message: "Route already assigned to another bus",
        });
      }
    }

    /* ── BUS ID UNIQUE CHECK ── */
    if (busId) {
      const exists = await Bus.findOne({
        schoolId: toId(school_id),
        busId: busId.trim(),
        _id: { $ne: id },
      });

      if (exists) {
        await session.abortTransaction();
        return res.status(400).json({
          message: "Bus ID already exists for this school",
        });
      }

      bus.busId = busId.trim();
    }

    /* ── BASIC FIELDS ── */
    if (regNo !== undefined) bus.regNo = regNo.trim();
    if (model !== undefined) bus.model = model.trim();
    if (capacity !== undefined) bus.capacity = Number(capacity);

    /* ── NEXT SERVICE + AUTO STATUS ── */
    if (nextService !== undefined) {
      bus.nextService = nextService || null;

      if (!status && nextService) {
        const today = new Date();
        const serviceDate = new Date(nextService);

        bus.status = serviceDate <= today ? "Maintenance" : "Active";
      }
    }

    if (status !== undefined) {
      bus.status = status;
    }

    /* ── GPS TRACKING ── */
    if (gpsEnabled !== undefined) bus.gpsEnabled = Boolean(gpsEnabled);
    if (gpsDeviceId !== undefined) {
      bus.gpsDeviceId = String(gpsDeviceId || "").trim();
    }
    if (lastLatitude !== undefined && lastLatitude !== "") {
      bus.lastLatitude = Number(lastLatitude);
    }
    if (lastLongitude !== undefined && lastLongitude !== "") {
      bus.lastLongitude = Number(lastLongitude);
    }
    if (
      (lastLatitude !== undefined && lastLatitude !== "") ||
      (lastLongitude !== undefined && lastLongitude !== "")
    ) {
      bus.lastGpsAt = new Date();
    }
    if (gpsSpeedKmh !== undefined && gpsSpeedKmh !== "") {
      bus.gpsSpeedKmh = Number(gpsSpeedKmh);
    }

    const prevDriver = bus.driver;
    const prevRoute = bus.route;

    /* ── UPDATE RELATIONS ── */
    if (driver !== undefined) bus.driver = resolveId(driver);
    if (route !== undefined) bus.route = resolveId(route);

    /* ── REMOVE OLD RELATIONS ── */
    if (prevDriver && prevDriver.toString() !== driver) {
      await Driver.findByIdAndUpdate(prevDriver, { bus: null }, { session });
    }

    if (prevRoute && prevRoute.toString() !== route) {
      await TransportRoute.findByIdAndUpdate(
        prevRoute,
        { bus: null },
        { session },
      );
    }

    /* ── ASSIGN NEW RELATIONS ── */
    if (driver) {
      await Driver.findByIdAndUpdate(
        driver,
        {
          bus: id,
          route: resolveId(route), // 🔥 IMPORTANT FIX
        },
        { session },
      );
    }

    if (route) {
      await TransportRoute.findByIdAndUpdate(route, { bus: id }, { session });
    }

    await bus.save({ session });

    await session.commitTransaction();

    res.json({
      success: true,
      message: "Bus updated successfully",
      data: bus,
    });
  } catch (err) {
    await session.abortTransaction();
    serverError(res, err);
  } finally {
    session.endSession();
  }
};

// PATCH /transport/buses/:id/status
// body: { school_id, status }
export const updateBusStatus = async (req, res) => {
  try {
    const school_id = req.user?.school_id;
    const { id } = req.params;
    const { status } = req.body;

    if (!school_id) return missingSchoolId(res);
    if (!["Active", "Maintenance", "Inactive"].includes(status))
      return res
        .status(400)
        .json({ success: false, message: "Invalid status value" });

    const bus = await Bus.findOneAndUpdate(
      { _id: id, schoolId: toId(school_id) },
      { status },
      { new: true },
    );
    if (!bus) return notFound(res, "Bus");

    res.json({ success: true, message: `Bus marked as ${status}`, data: bus });
  } catch (err) {
    serverError(res, err);
  }
};

/** GET /transport/buses/gps — fleet GPS overview */
export const getBusesGps = async (req, res) => {
  try {
    const school_id = req.user?.school_id;
    if (!school_id) return missingSchoolId(res);

    const buses = await Bus.find({ schoolId: toId(school_id) })
      .populate("driver", "name phone")
      .populate("route", "name")
      .select(
        "busId regNo model status gpsEnabled gpsDeviceId lastLatitude lastLongitude lastGpsAt gpsSpeedKmh driver route tripDate tripEvents insideSchoolGeofence",
      )
      .sort({ busId: 1 })
      .lean();

    const school = await School.findById(school_id)
      .select("latitude longitude geofenceRadiusM school_name")
      .lean();

    const data = buses.map((b) => {
      // Reset display if tripDate is not today
      const key = todayKey();
      const fresh =
        b.tripDate === key
          ? b
          : {
              ...b,
              tripDate: key,
              tripEvents: {
                pickup: { at: null, notified: false },
                arriveSchool: { at: null, notified: false },
                departSchool: { at: null, notified: false },
                arriveHome: { at: null, notified: false },
              },
            };
      return {
        ...fresh,
        trip: tripEventSnapshot(fresh),
      };
    });

    return res.json({
      success: true,
      data,
      schoolLocation: {
        latitude: school?.latitude ?? null,
        longitude: school?.longitude ?? null,
        geofenceRadiusM: school?.geofenceRadiusM ?? 250,
        name: school?.school_name || "",
      },
      summary: {
        total: buses.length,
        gpsEnabled: buses.filter((b) => b.gpsEnabled).length,
        live: buses.filter(
          (b) =>
            b.gpsEnabled &&
            b.lastLatitude != null &&
            b.lastLongitude != null,
        ).length,
      },
    });
  } catch (err) {
    serverError(res, err);
  }
};

/** PATCH /transport/buses/:id/gps — update live location / toggle GPS */
export const updateBusGps = async (req, res) => {
  try {
    const school_id = req.user?.school_id;
    const { id } = req.params;
    const {
      gpsEnabled,
      gpsDeviceId,
      latitude,
      longitude,
      lastLatitude,
      lastLongitude,
      gpsSpeedKmh,
    } = req.body;

    if (!school_id) return missingSchoolId(res);

    const bus = await Bus.findOne({
      _id: id,
      schoolId: toId(school_id),
    });
    if (!bus) return notFound(res, "Bus");

    if (gpsEnabled !== undefined) bus.gpsEnabled = Boolean(gpsEnabled);
    if (gpsDeviceId !== undefined) {
      bus.gpsDeviceId = String(gpsDeviceId || "").trim();
    }

    const lat = latitude ?? lastLatitude;
    const lng = longitude ?? lastLongitude;
    if (lat !== undefined && lat !== "" && lng !== undefined && lng !== "") {
      bus.lastLatitude = Number(lat);
      bus.lastLongitude = Number(lng);
      bus.lastGpsAt = new Date();
    }
    if (gpsSpeedKmh !== undefined && gpsSpeedKmh !== "") {
      bus.gpsSpeedKmh = Number(gpsSpeedKmh);
    }

    await bus.save();

    // Auto notify parents on school arrive / depart when campus GPS is set
    let autoTrip = null;
    if (lat !== undefined && lat !== "" && lng !== undefined && lng !== "") {
      try {
        autoTrip = await maybeAutoSchoolGeofence(
          bus,
          school_id,
          req.user?._id || null,
        );
      } catch (e) {
        console.error("maybeAutoSchoolGeofence:", e.message);
      }
    }

    return res.json({
      success: true,
      message: "Bus GPS updated successfully",
      data: bus,
      trip: tripEventSnapshot(bus),
      autoTrip,
    });
  } catch (err) {
    serverError(res, err);
  }
};

/**
 * POST /transport/buses/:id/trip-event
 * body: { event: pickup | arrive_school | depart_school | arrive_home }
 * Sends parent notification for that trip stage (once per day).
 */
export const recordBusTripEvent = async (req, res) => {
  try {
    const school_id = req.user?.school_id;
    const { id } = req.params;
    const event = String(req.body?.event || "")
      .trim()
      .toLowerCase();

    if (!school_id) return missingSchoolId(res);
    if (!TRIP_EVENTS.includes(event)) {
      return res.status(400).json({
        success: false,
        message:
          "event must be one of: pickup, arrive_school, depart_school, arrive_home",
      });
    }

    const bus = await Bus.findOne({
      _id: id,
      schoolId: toId(school_id),
    }).populate("route", "name");

    if (!bus) return notFound(res, "Bus");

    const result = await fireTripEvent({
      bus,
      event,
      schoolId: school_id,
      createdBy: req.user?._id || null,
      source: "manual",
    });

    if (!result.sent) {
      return res.status(result.skipped ? 200 : 400).json({
        success: result.skipped,
        message: result.reason || "Could not send trip notification",
        trip: result.trip,
        notifiedCount: 0,
      });
    }

    return res.json({
      success: true,
      message: `Parents notified: ${TRIP_EVENT_META[event].title}`,
      notifiedCount: result.notifiedCount,
      trip: result.trip,
    });
  } catch (err) {
    serverError(res, err);
  }
};

/** GET /transport/school-location — campus GPS for geofence */
export const getSchoolTransportLocation = async (req, res) => {
  try {
    const school_id = req.user?.school_id;
    if (!school_id) return missingSchoolId(res);
    const school = await School.findById(school_id)
      .select("school_name latitude longitude geofenceRadiusM address")
      .lean();
    if (!school) return notFound(res, "School");
    return res.json({
      success: true,
      data: {
        name: school.school_name,
        address: school.address || "",
        latitude: school.latitude ?? null,
        longitude: school.longitude ?? null,
        geofenceRadiusM: school.geofenceRadiusM ?? 250,
      },
    });
  } catch (err) {
    serverError(res, err);
  }
};

/** PUT /transport/school-location — set campus GPS used for arrive/depart alerts */
export const updateSchoolTransportLocation = async (req, res) => {
  try {
    const school_id = req.user?.school_id;
    if (!school_id) return missingSchoolId(res);

    const { latitude, longitude, geofenceRadiusM } = req.body;
    const update = {};
    if (latitude !== undefined && latitude !== "") {
      update.latitude = Number(latitude);
    }
    if (longitude !== undefined && longitude !== "") {
      update.longitude = Number(longitude);
    }
    if (geofenceRadiusM !== undefined && geofenceRadiusM !== "") {
      update.geofenceRadiusM = Math.max(50, Number(geofenceRadiusM) || 250);
    }

    if (!Object.keys(update).length) {
      return res.status(400).json({
        success: false,
        message: "Provide latitude, longitude, and/or geofenceRadiusM",
      });
    }

    const school = await School.findByIdAndUpdate(
      school_id,
      { $set: update },
      { new: true },
    ).select("school_name latitude longitude geofenceRadiusM address");

    if (!school) return notFound(res, "School");

    return res.json({
      success: true,
      message: "School location saved for bus geofence alerts",
      data: school,
    });
  } catch (err) {
    serverError(res, err);
  }
};

// DELETE /transport/buses/:id?school_id=
export const deleteBus = async (req, res) => {
  try {
    const school_id = req.user?.school_id;
    const { id } = req.params;

    if (!school_id) return missingSchoolId(res);
    await Driver.updateMany({ bus: id }, { $set: { bus: null } });
    await TransportRoute.updateMany({ bus: id }, { $set: { bus: null } });
    const bus = await Bus.findOneAndDelete({
      _id: id,
      schoolId: toId(school_id),
    });
    if (!bus) return notFound(res, "Bus");

    res.json({ success: true, message: "Bus deleted successfully" });
  } catch (err) {
    serverError(res, err);
  }
};

// ════════════════════════════════════════════════════════════════════════════
// ROUTES
// ════════════════════════════════════════════════════════════════════════════

// GET /transport/routes?school_id=
export const getRoutes = async (req, res) => {
  try {
    const school_id = req.user?.school_id;
    if (!school_id) return missingSchoolId(res);

    const routes = await TransportRoute.find({ schoolId: toId(school_id) })
      .populate("bus", "busId")
      .populate("driver", "name")
      .sort({ createdAt: -1 })
      .lean();

    const data = routes.map((r) => ({
      ...r,
      id: r.routeId,
    }));

    res.json({ success: true, data });
  } catch (err) {
    serverError(res, err);
  }
};

// POST /transport/routes
// body: { school_id, name, bus, driver, stops, students, startTime, endTime, stopsList }
export const createRoute = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const school_id = req.user?.school_id;
    const {
      name,
      bus,
      driver,
      stops,
      students,
      startTime,
      endTime,
      stopsList,
    } = req.body;

    if (!school_id) return missingSchoolId(res);
    if (!name?.trim())
      return res.status(400).json({ message: "Route name is required" });

    const busId = resolveId(bus);
    const driverId = resolveId(driver);

    const route = new TransportRoute({
      schoolId: toId(school_id),
      name: name.trim(),
      bus: busId,
      driver: driverId,
      stops: Number(stops) || 0,
      students: Number(students) || 0,
      startTime: startTime || "",
      endTime: endTime || "",
      stopsList: Array.isArray(stopsList) ? stopsList : [],
    });

    await route.save({ session });

    // 🔥 CLEAR OLD RELATIONS
    if (busId) {
      await TransportRoute.updateMany(
        { bus: busId, _id: { $ne: route._id } },
        { $set: { bus: null } },
        { session },
      );
    }

    if (driverId) {
      await TransportRoute.updateMany(
        { driver: driverId, _id: { $ne: route._id } },
        { $set: { driver: null } },
        { session },
      );
    }

    // 🔥 ASSIGN RELATIONS
    if (busId) {
      await Bus.findByIdAndUpdate(busId, { route: route._id }, { session });
    }

    if (driverId) {
      await Driver.findByIdAndUpdate(
        driverId,
        {
          route: route._id,
          bus: busId,
        },
        { session },
      );
    }

    await session.commitTransaction();

    await Activity.create({
      schoolId: toId(school_id),
      bus: busId || undefined,
      route: route._id,
      driver: driverId || undefined,
      status: "Route Created",
      time: new Date().toLocaleTimeString(),
    });

    res.status(201).json({
      success: true,
      message: "Route created successfully",
      data: route,
    });
  } catch (err) {
    await session.abortTransaction();
    serverError(res, err);
  } finally {
    session.endSession();
  }
};

// PUT /transport/routes/:id
// body: { school_id, name, bus, driver, stops, students, startTime, endTime, stopsList, status }
export const updateRoute = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const school_id = req.user?.school_id;
    const { id } = req.params;
    const {
      name,
      bus,
      driver,
      stops,
      students,
      startTime,
      endTime,
      stopsList,
      status,
    } = req.body;

    if (!school_id) return missingSchoolId(res);

    const busId = resolveId(bus);
    const driverId = resolveId(driver);

    const route = await TransportRoute.findOne({
      _id: id,
      schoolId: toId(school_id),
    }).session(session);

    if (!route) return notFound(res, "Route");

    // UPDATE FIELDS
    if (name !== undefined) route.name = name.trim();
    if (stops !== undefined) route.stops = Number(stops);
    if (students !== undefined) route.students = Number(students);
    if (startTime !== undefined) route.startTime = startTime;
    if (endTime !== undefined) route.endTime = endTime;
    if (stopsList !== undefined)
      route.stopsList = Array.isArray(stopsList) ? stopsList : [];
    if (status !== undefined) route.status = status;

    route.bus = busId;
    route.driver = driverId;

    // 🔥 CLEAR OLD RELATIONS
    await Bus.updateMany({ route: id }, { $set: { route: null } }, { session });

    await Driver.updateMany(
      { route: id },
      { $set: { route: null, bus: null } },
      { session },
    );

    // 🔥 ASSIGN NEW RELATIONS
    if (route.status === "Active") {
      if (busId) {
        await Bus.findByIdAndUpdate(busId, { route: id }, { session });
      }

      if (driverId) {
        await Driver.findByIdAndUpdate(
          driverId,
          {
            route: id,
            bus: busId,
          },
          { session },
        );
      }
    } else {
      route.bus = null;
      route.driver = null;
    }

    await route.save({ session });
    await session.commitTransaction();

    res.json({
      success: true,
      message: "Route updated successfully",
      data: route,
    });
  } catch (err) {
    await session.abortTransaction();
    serverError(res, err);
  } finally {
    session.endSession();
  }
};

// PATCH /transport/routes/:id/status
// body: { school_id, status }
export const updateRouteStatus = async (req, res) => {
  try {
    const school_id = req.user?.school_id;
    const { id } = req.params;
    const { status } = req.body;

    if (!school_id) return missingSchoolId(res);
    if (!["Active", "Suspended"].includes(status))
      return res
        .status(400)
        .json({ success: false, message: "Invalid status value" });

    const route = await TransportRoute.findOneAndUpdate(
      { _id: id, schoolId: toId(school_id) },
      { status },
      { new: true },
    );
    if (!route) return notFound(res, "Route");

    res.json({
      success: true,
      message: `Route marked as ${status}`,
      data: route,
    });
  } catch (err) {
    serverError(res, err);
  }
};

// DELETE /transport/routes/:id?school_id=
export const deleteRoute = async (req, res) => {
  try {
    const school_id = req.user?.school_id;
    const { id } = req.params;

    if (!school_id) return missingSchoolId(res);

    await Bus.updateMany({ route: id }, { $set: { route: null } });
    await Driver.updateMany({ route: id }, { $set: { route: null } });

    const route = await TransportRoute.findOneAndDelete({
      _id: id,
      schoolId: toId(school_id),
    });
    if (!route) return notFound(res, "Route");

    res.json({ success: true, message: "Route deleted successfully" });
  } catch (err) {
    serverError(res, err);
  }
};

/* SUPER ADMIN */
// GET /transport/drivers?school_id=
export const getAdminDrivers = async (req, res) => {
  try {
    if (req.user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const school_id = req.query.schoolId;
    if (!school_id) return missingSchoolId(res);

    const drivers = await Driver.find({ schoolId: toId(school_id) })
      .populate("bus", "busId regNo")
      .populate("route", "name")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: drivers });
  } catch (err) {
    serverError(res, err);
  }
};

export const getAdminBuses = async (req, res) => {
  try {
    if (req.user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const school_id = req.query.schoolId;
    if (!school_id) return missingSchoolId(res);

    const buses = await Bus.find({ schoolId: toId(school_id) })
      .populate("driver", "name")
      .populate("route", "name")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: buses });
  } catch (err) {
    serverError(res, err);
  }
};

export const getAdminRoutes = async (req, res) => {
  try {
    if (req.user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const school_id = req.query.schoolId;
    if (!school_id) return missingSchoolId(res);

    const routes = await TransportRoute.find({ schoolId: toId(school_id) })
      .populate("bus", "busId")
      .populate("driver", "name")
      .sort({ createdAt: -1 })
      .lean();

    const data = routes.map((r) => ({
      ...r,
      id: r.routeId,
    }));

    res.json({ success: true, data });
  } catch (err) {
    serverError(res, err);
  }
};

export const getAdminSummary = async (req, res) => {
  try {
    if (req.user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const school_id = req.query.schoolId;
    if (!school_id) return missingSchoolId(res);

    const schoolObjId = toId(school_id);

    const [buses, routes, drivers] = await Promise.all([
      Bus.find({ schoolId: schoolObjId }).lean(),
      TransportRoute.find({ schoolId: schoolObjId }).lean(),
      Driver.find({ schoolId: schoolObjId }).lean(),
    ]);

    const totalStudents = routes.reduce((sum, r) => sum + (r.students || 0), 0);

    res.json({
      success: true,
      buses: buses.length,
      routes: routes.length,
      drivers: drivers.length,
      students: totalStudents,
      maintenance: buses.filter((b) => b.status === "Maintenance").length,
      suspended: routes.filter((r) => r.status === "Suspended").length,
      on_leave: drivers.filter((d) => d.status === "On Leave").length,
    });
  } catch (err) {
    serverError(res, err);
  }
};

export const getParentTransport = async (req, res) => {
  try {
    const studentId = req.user?.student_id;
    const schoolId  = req.user?.school_id;
 
    if (!studentId || !schoolId) {
      return res.status(400).json({
        success: false,
        message: "Missing credentials",
      });
    }
 
    // 1. Fetch the student to get their transport (route) ref
    const student = await Student.findOne({
      _id: new mongoose.Types.ObjectId(studentId),
      schoolId: new mongoose.Types.ObjectId(schoolId),
    }).select("transport busFeeFrequency busFeeQuarter firstName lastName").lean();
 
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }
 
    // 2. No transport assigned
    if (!student.transport) {
      return res.json({
        success: true,
        assigned: false,
        data: null,
      });
    }
 
    // 3. Fetch the route with full population (include bus GPS for parents)
    const route = await TransportRoute.findOne({
      _id: student.transport,
      schoolId: new mongoose.Types.ObjectId(schoolId),
    })
      .populate(
        "bus",
        "busId regNo model capacity status nextService gpsEnabled lastLatitude lastLongitude lastGpsAt gpsSpeedKmh",
      )
      .populate("driver", "name phone license licenseExpiry experience status photo")
      .lean();
 
    if (!route) {
      return res.json({
        success: true,
        assigned: false,
        data: null,
      });
    }

    const bus = route.bus
      ? {
          busId: route.bus.busId,
          regNo: route.bus.regNo,
          model: route.bus.model,
          capacity: route.bus.capacity,
          status: route.bus.status,
          nextService: route.bus.nextService,
          gps: {
            enabled: Boolean(route.bus.gpsEnabled),
            latitude: route.bus.gpsEnabled ? route.bus.lastLatitude ?? null : null,
            longitude: route.bus.gpsEnabled
              ? route.bus.lastLongitude ?? null
              : null,
            lastUpdated: route.bus.gpsEnabled
              ? route.bus.lastGpsAt ?? null
              : null,
            speedKmh: route.bus.gpsEnabled
              ? route.bus.gpsSpeedKmh ?? null
              : null,
            hasLiveFix: Boolean(
              route.bus.gpsEnabled &&
                route.bus.lastLatitude != null &&
                route.bus.lastLongitude != null,
            ),
          },
        }
      : null;
 
    return res.json({
      success: true,
      assigned: true,
      data: {
        route: {
          _id:        route._id,
          routeId:    route.routeId,
          name:       route.name,
          status:     route.status,
          stops:      route.stops,
          students:   route.students,
          startTime:  route.startTime,
          endTime:    route.endTime,
          stopsList:  route.stopsList || [],
        },
        bus,
        driver: route.driver || null,
        busFeeFrequency: student.busFeeFrequency,
        busFeeQuarter:   student.busFeeQuarter,
      },
    });
  } catch (err) {
    console.error("getParentTransport error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};