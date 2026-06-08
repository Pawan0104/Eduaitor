import Event from "../models/event.js";
import Student from "../models/student.js";
import Class from "../models/class.js";
import {createNotificationHelper}  from "../controllers/notificationController.js"

const buildEventTargets = async (assignClass, schoolId) => {
  if (!assignClass || assignClass === 'All Classes') {
    return [{ type: 'all' }];
  }

  // Look up the class ObjectId by name
  const classDoc = await Class.findOne({ 
    name: assignClass, 
    schoolId 
  }).select('_id').lean();

  if (!classDoc) return [{ type: 'all' }]; // fallback to all if class not found

  return [{ type: 'class', classId: classDoc._id }];
};


// GET all events for a school
export const getAllEvents = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const role = req.user?.role;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: "School ID required",
      });
    }

    let className = null;

    if (role === "student_admin") {
      const studentId = req.user?.student_id;

      if (studentId) {
        const student = await Student.findById(studentId).populate(
          "classId",
          "name",
        );

        className = student?.classId?.name || null;
      }
    }

    // 🔹 Build query
    let query = { schoolId };

    if (className) {
      query.$or = [{ assignClass: "All Classes" }, { assignClass: className }];
    }

    const events = await Event.find(query).sort({ startDate: -1 });

    // 🔹 Stats calculation
    const now = new Date();

    let completed = 0;
    let upcoming = 0;
    const categorySet = new Set();

    events.forEach((e) => {
      const end = new Date(e.endDate || e.startDate);
      const start = new Date(e.startDate);

      if (end < now) completed++;
      if (start > now) upcoming++;

      if (e.type) categorySet.add(e.type);
    });

    res.status(200).json({
      success: true,
      events,
      stats: {
        total: events.length,
        completed,
        upcoming,
        categories: categorySet.size,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// GET single event by ID
export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event)
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    res.status(200).json({ success: true, event });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST create event
export const createEvent = async (req, res) => {
  console.log(req.user?._id, req.user?.id)
  try {
    const schoolId = req.user?.school_id;
    const event = await Event.create({ ...req.body, schoolId });
    console.log(event)
    const targets = await buildEventTargets(event.assignClass, schoolId);
     await createNotificationHelper({
      title: `New Event: ${event.title}`,
      message: `${event.description}`,
      notificationType: "general",
      targets,
      schoolId,
      createdBy: req.user.id,
      startingDate:event.startDate || date.now,
      endingDate:event.endDate || "",
    });
    res
      .status(201)
      .json({ success: true, message: "Event created successfully", event });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT update event
export const updateEvent = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    console.log(`schoolId- ${schoolId} \n ${req.params.id}`)
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!event)
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
         const targets = await buildEventTargets(event.assignClass, schoolId);

    await createNotificationHelper({
      title: `Event Updated: ${event.title}`,
      message: `${event.description}.`,
      notificationType: "general",
      targets,
      schoolId,
      createdBy: req.user.id,
      startingDate:event.startDate || date.now,
      endingDate:event.endDate || "",
    });
    res
      .status(200)
      .json({ success: true, message: "Event updated successfully", event });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE event
export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event)
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    res
      .status(200)
      .json({ success: true, message: "Event deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET all events for super admin
export const getAllAdminEvents = async (req, res) => {
  try {
    if (req.user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const schoolId = req.query.schoolId;
    const events = await Event.find({ schoolId }).sort({ createdAt: -1 });

    const total = events.length;
    const completed = events.filter((e) => {
      const end = e.endDate || e.startDate;
      return new Date(end) < new Date();
    }).length;
    const upcoming = events.filter(
      (e) => new Date(e.startDate) > new Date(),
    ).length;
    const categories = [...new Set(events.map((e) => e.type))].length;

    res.status(200).json({
      success: true,
      stats: { total, completed, upcoming, categories },
      events,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
