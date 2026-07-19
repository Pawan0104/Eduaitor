import Hostel from "../models/hostel.js";
import HostelResident from "../models/hostelResident.js";
import HostelVisitor from "../models/hostelVisitor.js";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";
import { createNotificationHelper } from "./notificationController.js";

const getSchoolId = (req) => req.user?.school_id;

const resolveActor = (user = {}) => ({
  userId: user._id || user.id || user.staff_id || user.teacher_id || null,
  name: user.name || user.username || user.email || "Staff",
  role: user.role || "",
});

const populateVisitor = (query) =>
  query
    .populate("hostelId", "name code type wardenName wardenPhone")
    .populate({
      path: "residentId",
      select: "bedNumber status roomId hostelId studentId",
      populate: [
        {
          path: "studentId",
          select: "firstName lastName studentId",
        },
        { path: "roomId", select: "roomNumber floor" },
      ],
    })
    .populate("studentId", "firstName lastName studentId");

const uploadVisitorPhoto = async (req) => {
  const file = req.file || req.files?.photo?.[0] || null;
  if (!file) return null;
  const uploaded = await uploadToCloudinary(file, "hostel/visitors");
  return {
    url: uploaded.url,
    public_id: uploaded.public_id,
    type: uploaded.type || file.mimetype,
  };
};

/* ---------------- LIST ---------------- */
export const getVisitors = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "School not identified.",
      });
    }

    const { search, status, hostelId } = req.query;
    const filter = { schoolId };

    if (status && status !== "all") filter.status = status;

    if (hostelId) filter.hostelId = hostelId;

    let visitors = await populateVisitor(
      HostelVisitor.find(filter).sort({ createdAt: -1 }),
    ).lean();

    if (search?.trim()) {
      const q = search.trim().toLowerCase();
      visitors = visitors.filter((v) => {
        const student = v.studentId || v.residentId?.studentId || null;
        const studentName = `${student?.firstName || ""} ${student?.lastName || ""}`
          .trim()
          .toLowerCase();
        return (
          v.visitorName?.toLowerCase().includes(q) ||
          v.phone?.toLowerCase().includes(q) ||
          v.whomVisiting?.toLowerCase().includes(q) ||
          v.purpose?.toLowerCase().includes(q) ||
          v.idProofNumber?.toLowerCase().includes(q) ||
          v.hostelId?.name?.toLowerCase().includes(q) ||
          studentName.includes(q) ||
          student?.studentId?.toLowerCase().includes(q)
        );
      });
    }

    return res.json({ success: true, data: visitors });
  } catch (error) {
    next(error);
  }
};

/* ---------------- CREATE (guard submits for approval) ---------------- */
export const createVisitor = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "School not identified.",
      });
    }

    const {
      hostelId,
      visitorName,
      phone,
      idProofType,
      idProofNumber,
      purpose,
      whomVisiting,
      residentId,
      notes,
    } = req.body;

    if (!hostelId) {
      return res.status(400).json({
        success: false,
        message: "Hostel is required.",
      });
    }
    if (!String(visitorName || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "Visitor name is required.",
      });
    }

    const photo = await uploadVisitorPhoto(req);
    if (!photo?.url) {
      return res.status(400).json({
        success: false,
        message: "Live visitor photo is required.",
      });
    }

    const hostel = await Hostel.findOne({ _id: hostelId, schoolId });
    if (!hostel) {
      return res.status(404).json({
        success: false,
        message: "Hostel not found.",
      });
    }

    let studentId = null;
    let resolvedWhom = String(whomVisiting || "").trim();

    if (residentId) {
      const resident = await HostelResident.findOne({
        _id: residentId,
        schoolId,
        status: "Active",
      }).populate("studentId", "firstName lastName studentId");

      if (!resident) {
        return res.status(404).json({
          success: false,
          message: "Active resident not found.",
        });
      }
      if (String(resident.hostelId) !== String(hostelId)) {
        return res.status(400).json({
          success: false,
          message: "Selected resident does not belong to this hostel.",
        });
      }
      studentId = resident.studentId?._id || resident.studentId;
      if (!resolvedWhom && resident.studentId) {
        resolvedWhom =
          `${resident.studentId.firstName || ""} ${resident.studentId.lastName || ""}`.trim();
      }
    }

    const submittedBy = resolveActor(req.user);

    const visitor = await HostelVisitor.create({
      schoolId,
      hostelId,
      visitorName: String(visitorName).trim(),
      phone: String(phone || "").trim(),
      idProofType: idProofType || "Other",
      idProofNumber: String(idProofNumber || "").trim(),
      purpose: String(purpose || "").trim(),
      whomVisiting: resolvedWhom,
      residentId: residentId || null,
      studentId,
      photo,
      status: "Pending",
      checkInAt: null,
      submittedBy,
      notes: String(notes || "").trim(),
    });

    try {
      await createNotificationHelper({
        title: "Hostel visitor approval needed",
        message: `${visitor.visitorName} is waiting at the gate for ${hostel.name}. Review and approve or reject entry.`,
        notificationType: "general",
        schoolId,
        createdBy: submittedBy.userId,
        targets: [
          { type: "role", roles: ["school_admin"] },
          { type: "role", roles: ["staff_admin"] },
        ],
      });
    } catch (notifyErr) {
      console.error("Visitor approval notify failed:", notifyErr.message);
    }

    const data = await populateVisitor(HostelVisitor.findById(visitor._id)).lean();

    return res.status(201).json({
      success: true,
      message: "Visitor request submitted for warden approval.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

/* ---------------- APPROVE (warden — grants entry) ---------------- */
export const approveVisitor = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { id } = req.params;

    const visitor = await HostelVisitor.findOne({ _id: id, schoolId });
    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: "Visitor record not found.",
      });
    }
    if (visitor.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending visitor requests can be approved.",
      });
    }

    const reviewer = resolveActor(req.user);
    visitor.status = "CheckedIn";
    visitor.checkInAt = new Date();
    visitor.reviewedBy = reviewer;
    visitor.reviewedAt = new Date();
    visitor.approvedByName = reviewer.name;
    visitor.rejectionReason = "";
    await visitor.save();

    const data = await populateVisitor(HostelVisitor.findById(visitor._id)).lean();

    return res.json({
      success: true,
      message: "Visitor approved. Entry granted.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

/* ---------------- REJECT ---------------- */
export const rejectVisitor = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { id } = req.params;
    const reason = String(req.body?.reason || req.body?.rejectionReason || "").trim();

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Please provide a reason for rejection.",
      });
    }

    const visitor = await HostelVisitor.findOne({ _id: id, schoolId });
    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: "Visitor record not found.",
      });
    }
    if (visitor.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending visitor requests can be rejected.",
      });
    }

    const reviewer = resolveActor(req.user);
    visitor.status = "Rejected";
    visitor.reviewedBy = reviewer;
    visitor.reviewedAt = new Date();
    visitor.rejectionReason = reason;
    visitor.approvedByName = "";
    await visitor.save();

    const data = await populateVisitor(HostelVisitor.findById(visitor._id)).lean();

    return res.json({
      success: true,
      message: "Visitor request rejected.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

/* ---------------- UPDATE (pending / checked-in only) ---------------- */
export const updateVisitor = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { id } = req.params;

    const visitor = await HostelVisitor.findOne({ _id: id, schoolId });
    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: "Visitor record not found.",
      });
    }

    if (["CheckedOut", "Rejected"].includes(visitor.status)) {
      return res.status(400).json({
        success: false,
        message: "Cannot edit a checked-out or rejected visitor.",
      });
    }

    const fields = [
      "visitorName",
      "phone",
      "idProofType",
      "idProofNumber",
      "purpose",
      "whomVisiting",
      "notes",
    ];
    for (const key of fields) {
      if (req.body[key] !== undefined) {
        visitor[key] =
          typeof req.body[key] === "string"
            ? req.body[key].trim()
            : req.body[key];
      }
    }

    if (req.body.hostelId) {
      const hostel = await Hostel.findOne({
        _id: req.body.hostelId,
        schoolId,
      });
      if (!hostel) {
        return res.status(404).json({
          success: false,
          message: "Hostel not found.",
        });
      }
      visitor.hostelId = req.body.hostelId;
    }

    if (req.body.residentId !== undefined) {
      if (!req.body.residentId) {
        visitor.residentId = null;
        visitor.studentId = null;
      } else {
        const resident = await HostelResident.findOne({
          _id: req.body.residentId,
          schoolId,
          status: "Active",
        }).populate("studentId", "firstName lastName");
        if (!resident) {
          return res.status(404).json({
            success: false,
            message: "Active resident not found.",
          });
        }
        if (String(resident.hostelId) !== String(visitor.hostelId)) {
          return res.status(400).json({
            success: false,
            message: "Selected resident does not belong to this hostel.",
          });
        }
        visitor.residentId = resident._id;
        visitor.studentId = resident.studentId?._id || resident.studentId;
        if (!visitor.whomVisiting && resident.studentId) {
          visitor.whomVisiting =
            `${resident.studentId.firstName || ""} ${resident.studentId.lastName || ""}`.trim();
        }
      }
    }

    const photo = await uploadVisitorPhoto(req);
    if (photo?.url) visitor.photo = photo;

    await visitor.save();
    const data = await populateVisitor(HostelVisitor.findById(visitor._id)).lean();

    return res.json({
      success: true,
      message: "Visitor updated successfully.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

/* ---------------- CHECK-OUT ---------------- */
export const checkoutVisitor = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { id } = req.params;

    const visitor = await HostelVisitor.findOne({ _id: id, schoolId });
    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: "Visitor record not found.",
      });
    }
    if (visitor.status !== "CheckedIn") {
      return res.status(400).json({
        success: false,
        message: "Only checked-in visitors can be checked out.",
      });
    }

    visitor.status = "CheckedOut";
    visitor.checkOutAt = new Date();
    await visitor.save();

    const data = await populateVisitor(HostelVisitor.findById(visitor._id)).lean();

    return res.json({
      success: true,
      message: "Visitor checked out successfully.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

/* ---------------- DELETE ---------------- */
export const deleteVisitor = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { id } = req.params;

    const visitor = await HostelVisitor.findOneAndDelete({
      _id: id,
      schoolId,
    });
    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: "Visitor record not found.",
      });
    }

    return res.json({
      success: true,
      message: "Visitor record deleted.",
    });
  } catch (error) {
    next(error);
  }
};
