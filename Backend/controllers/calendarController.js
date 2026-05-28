import Calendar from "../models/calendar.js";

// ── helpers ───────────────────────────────────────────────────────────────────

const handleError = (res, err, status = 500) =>
  res
    .status(status)
    .json({ success: false, message: err.message || "Server error" });

// ── CREATE ────────────────────────────────────────────────────────────────────

export const createEvent = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    // const academicYearId = req.body.academicYearId;

    if (!schoolId)
      return res
        .status(400)
        .json({ success: false, message: "School context missing" });
    // if (!academicYearId)
    //   return res
    //     .status(400)
    //     .json({ success: false, message: "academicYearId is required" });

    // Strip any color field sent by older clients
    const { color: _ignored, ...rest } = req.body;

    const event = await Calendar.create({
      ...rest,
      schoolId,
    //   academicYearId,
      createdBy: req.user?._id,
    });

    res
      .status(201)
      .json({ success: true, message: "Event created successfully", event });
  } catch (err) {
    if (err.name === "ValidationError") {
      const message = Object.values(err.errors)
        .map((e) => e.message)
        .join(", ");
      return res.status(400).json({ success: false, message });
    }
    handleError(res, err);
  }
};

// ── GET ALL (date-range + school filter) ──────────────────────────────────────

export const getEvents = async (req, res) => {
  try {
    const schoolId = req.user?.school_id || req.query.schoolId;
    // const { start, end, type, academicYearId } = req.query;
    const { start, end, type } = req.query;

    if (!schoolId)
      return res
        .status(400)
        .json({ success: false, message: "schoolId is required" });

    const filter = { schoolId };

    // Date range — events that overlap [start, end]
    if (start && end) {
      filter.$or = [
        // starts within range
        { startDate: { $gte: new Date(start), $lte: new Date(end) } },
        // ends within range
        { endDate: { $gte: new Date(start), $lte: new Date(end) } },
        // spans the entire range
        {
          startDate: { $lte: new Date(start) },
          endDate: { $gte: new Date(end) },
        },
      ];
    }

    if (type) filter.type = type;
    // if (academicYearId) filter.academicYearId = academicYearId;

    const events = await Calendar.find(filter)
      .sort({ startDate: 1 })
      .populate("createdBy", "name email");

    res.json({ success: true, count: events.length, events });
  } catch (err) {
    handleError(res, err);
  }
};

// ── GET SINGLE ────────────────────────────────────────────────────────────────

export const getEventById = async (req, res) => {
  try {
    const event = await Calendar.findById(req.params.id).populate(
      "createdBy",
      "name email",
    );
    if (!event)
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    res.json({ success: true, event });
  } catch (err) {
    handleError(res, err);
  }
};

// ── UPDATE ────────────────────────────────────────────────────────────────────

export const updateEvent = async (req, res) => {
  try {
    // Strip color from updates too
    const { color: _ignored, ...updates } = req.body;

    const event = await Calendar.findOneAndUpdate(
      { _id: req.params.id, schoolId: req.user?.school_id },
      { $set: updates },
      { new: true, runValidators: true },
    );

    if (!event)
      return res
        .status(404)
        .json({ success: false, message: "Event not found or access denied" });

    res.json({ success: true, message: "Event updated successfully", event });
  } catch (err) {
    if (err.name === "ValidationError") {
      const message = Object.values(err.errors)
        .map((e) => e.message)
        .join(", ");
      return res.status(400).json({ success: false, message });
    }
    handleError(res, err);
  }
};

// ── DELETE ────────────────────────────────────────────────────────────────────

export const deleteEvent = async (req, res) => {
  try {
    const event = await Calendar.findOneAndDelete({
      _id: req.params.id,
      schoolId: req.user?.school_id,
    });
    if (!event)
      return res
        .status(404)
        .json({ success: false, message: "Event not found or access denied" });
    res.json({ success: true, message: "Event deleted successfully" });
  } catch (err) {
    handleError(res, err);
  }
};

// ── BULK CREATE (e.g., import national holidays) ──────────────────────────────

export const bulkCreateEvents = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    // const { events, academicYearId } = req.body;
    const { events } = req.body;

    if (!Array.isArray(events) || events.length === 0)
      return res
        .status(400)
        .json({ success: false, message: "events array is required" });

    const docs = events.map(({ color: _ignored, ...ev }) => ({
      ...ev,
      schoolId,
      // academicYearId,
      createdBy: req.user?._id,
    }));

    const created = await Calendar.insertMany(docs, { ordered: false });
    res.status(201).json({
      success: true,
      message: `${created.length} events created`,
      events: created,
    });
  } catch (err) {
    handleError(res, err);
  }
};
