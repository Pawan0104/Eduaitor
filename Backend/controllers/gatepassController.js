import crypto from "crypto";
import GatePass from "../models/gatepass.js";
import Student from "../models/student.js";
import Class from "../models/class.js";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";
import { createNotificationHelper } from "./notificationController.js";

const GOVT_ID_TYPES = {
  AADHAAR: "Aadhaar",
  AADHAR: "Aadhaar",
  PAN: "PAN",
  DL: "DL",
  DRIVINGLICENCE: "DL",
  "DRIVING LICENCE": "DL",
  "DRIVING LICENSE": "DL",
};

const readablePassCode = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

const normalizePassCode = (value) =>
  readablePassCode(value).replace(/[^A-Z0-9]/g, "");

const normalizeIdNumber = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, "");

const validateGovtId = (rawType, rawNumber) => {
  const typeKey = String(rawType || "")
    .trim()
    .toUpperCase();
  const type = GOVT_ID_TYPES[typeKey];
  if (!type) {
    return { ok: false, message: "Select a valid government ID type" };
  }

  const number = normalizeIdNumber(rawNumber);
  if (!number) {
    return { ok: false, message: "Government ID number is required" };
  }

  if (type === "Aadhaar" && !/^\d{12}$/.test(number)) {
    return { ok: false, message: "Aadhaar number must be 12 digits" };
  }

  if (type === "PAN" && !/^[A-Z]{5}\d{4}[A-Z]$/.test(number.toUpperCase())) {
    return { ok: false, message: "PAN number is invalid" };
  }

  if (type === "DL" && !/^[A-Z0-9/-]{5,20}$/.test(number.toUpperCase())) {
    return { ok: false, message: "Driving licence number is invalid" };
  }

  return {
    ok: true,
    type,
    number: type === "Aadhaar" ? number : number.toUpperCase(),
  };
};

const generatePassCodeCandidate = () => {
  const now = new Date();
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const randomPart = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `GP-${datePart}-${randomPart}`;
};

const generateUniquePassCode = async (schoolId) => {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = generatePassCodeCandidate();
    const existing = await GatePass.exists({
      schoolId,
      $or: [
        { passCode: candidate },
        { barcodeValue: normalizePassCode(candidate) },
      ],
    });
    if (!existing) return candidate;
  }
  throw new Error("Could not generate a unique gate pass code");
};

/* ═══════════════════════════════════════════════════
   HELPER — get class teacher IDs for a student
   Used to notify class teacher when gatepass created
═══════════════════════════════════════════════════ */
const getClassTeacherIds = async (schoolId, sectionId) => {
  if (!sectionId) return [];

  const classDoc = await Class.findOne({
    schoolId,
    "details.sectionId": sectionId,
  }).select("details");

  if (!classDoc) return [];

  const section = classDoc.details.find(
    (d) => d.sectionId?.toString() === sectionId?.toString()
  );

  return section?.teacherId ? [section.teacherId] : [];
};

/* ═══════════════════════════════════════════════════
   1. CREATE GATEPASS — parent only
═══════════════════════════════════════════════════ */
export const createGatePass = async (req, res, next) => {
  try {
    const studentId = req.user.student_id;
    const schoolId  = req.user.school_id;
    const requestedBy = req.user._id;

    const {
      pickupName,
      pickupRelation,
      pickupCustomRelation,
      pickupMobile,
      idProofType,
      idProofNumber,
      exitDate,
      exitTime,
      expectedReturn,
      reason,
    } = req.body;

    // ── 1. VALIDATE ───────────────────────────────
    if (!pickupName?.trim())     return res.status(400).json({ success: false, message: "Pickup person name is required" });
    if (!pickupRelation)         return res.status(400).json({ success: false, message: "Pickup relation is required" });
    if (!pickupMobile?.trim())   return res.status(400).json({ success: false, message: "Pickup mobile is required" });
    if (!exitDate)               return res.status(400).json({ success: false, message: "Exit date is required" });
    if (!exitTime?.trim())       return res.status(400).json({ success: false, message: "Exit time is required" });
    if (!reason?.trim())         return res.status(400).json({ success: false, message: "Reason is required" });

    if (pickupRelation === "Other" && !pickupCustomRelation?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please specify the relation",
      });
    }

    const govtId = validateGovtId(idProofType, idProofNumber);
    if (!govtId.ok) {
      return res.status(400).json({
        success: false,
        message: govtId.message,
      });
    }

    // ── 2. FETCH STUDENT ──────────────────────────
    // verify student belongs to this school
    const student = await Student
      .findOne({ _id: studentId, schoolId })
      .select("firstName lastName sectionId classId");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // ── 3. HANDLE PHOTO ───────────────────────────
    let photo = null;
    if (req.file) {
      const uploaded = await uploadToCloudinary(req.file, "gatepass");
      photo = {
        url:       uploaded.url,
        public_id: uploaded.public_id,
        type:      req.file.mimetype,
      };
    }

    // ── 4. CREATE GATEPASS WITH UNIQUE PICKUP CODE ─
    let gatepass = null;
    let passCode = "";

    for (let attempt = 0; attempt < 5; attempt += 1) {
      passCode = await generateUniquePassCode(schoolId);
      try {
        gatepass = await GatePass.create({
          schoolId,
          studentId,
          requestedBy,
          pickupPerson: {
            name:           pickupName,
            relation:       pickupRelation,
            customRelation: pickupRelation === "Other" ? pickupCustomRelation : null,
            mobile:         pickupMobile,
            idProofType:    govtId.type,
            idProofNumber:  govtId.number,
          },
          passCode,
          barcodeValue: normalizePassCode(passCode),
          exitDate,
          exitTime,
          expectedReturn: expectedReturn || null,
          reason,
          photo,
          status: "pending",
        });
        break;
      } catch (createErr) {
        const isDuplicateCode =
          createErr?.code === 11000 &&
          Boolean(createErr?.keyPattern?.passCode || createErr?.keyPattern?.barcodeValue);
        if (isDuplicateCode && attempt < 4) continue;
        throw createErr;
      }
    }

    // ── 5. NOTIFY CLASS TEACHER + SCHOOL ADMIN ────
    try {
      const teacherIds = await getClassTeacherIds(schoolId, student.sectionId);

      const targets = [
        // notify school admin
        {
          type:     "role",
          roles:    ["school_admin"],
          schoolId,
        },
        // notify class teacher individually
        ...teacherIds.map((tid) => ({
          type:      "teacher",
          teacherId: tid,
          schoolId,
        })),
      ];

      await createNotificationHelper({
        title:            "New Gate Pass Request",
        message:          `A gate pass has been requested for ${student.firstName} ${student.lastName}. Pickup code: ${passCode}`,
        notificationType: "gatepass",
        eventType:        "PARENT.GATE_PASS",
        schoolId,
        targets,
        systemKey: `gatepass:request:${student._id}:${Date.now()}`,
        payloadExtras: {
          studentId: student._id,
          studentName: `${student.firstName} ${student.lastName}`.trim(),
          message: `Gate pass requested for ${student.firstName} ${student.lastName}. Pickup code: ${passCode}`,
          passCode,
        },
      });
    } catch (notifErr) {
      // notification failure should not break gatepass creation
      console.error("Notification error:", notifErr);
    }

    return res.status(201).json({
      success: true,
      message: "Gate pass request submitted successfully",
      data: gatepass,
    });

  } catch (error) {
    next(error);
  }
};

/* ═══════════════════════════════════════════════════
   2. GET MY GATEPASSES — parent sees own
═══════════════════════════════════════════════════ */
export const getMyGatePasses = async (req, res, next) => {
  try {
    const studentId = req.user.student_id;

    const { status, date } = req.query;

    // ── BUILD FILTER ──────────────────────────────
    const filter = { studentId };

    if (status && status !== "all") {
      filter.status = status;
    }

    if (date) {
      // filter by exact date — match all records on that day
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.exitDate = { $gte: start, $lte: end };
    }

    const gatepasses = await GatePass
      .find(filter)
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: gatepasses,
    });

  } catch (error) {
    next(error);
  }
};

/* ═══════════════════════════════════════════════════
   3. GET MANAGE GATEPASSES — teacher / admin / staff
═══════════════════════════════════════════════════ */
export const getManageGatePasses = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const role     = req.user.role;

    const { status, date, classId, sectionId, search } = req.query;

    // ── TEACHER — scope to their class only ───────
    let allowedStudentIds = null;

    if (role === "teacher_admin") {
      const teacherId = req.user.teacher_id;

      // find classes where this teacher is class teacher
      const classes = await Class.find({
        schoolId,
        "details.teacherId": teacherId,
      }).select("details");

      if (!classes.length) {
        return res.json({
          success: true,
          data: [],
          message: "You are not assigned as class teacher of any class",
          notClassTeacher: true,
        });
      }

      // get section IDs where this teacher is class teacher
      const sectionIds = classes.flatMap((c) =>
        c.details
          .filter((d) => d.teacherId?.toString() === teacherId?.toString())
          .map((d) => d.sectionId)
          .filter(Boolean)
      );

      // get students in those sections
      const students = await Student
        .find({ schoolId, sectionId: { $in: sectionIds } })
        .select("_id");

      allowedStudentIds = students.map((s) => s._id);

      if (!allowedStudentIds.length) {
        return res.json({
          success: true,
          data: [],
          message: "No students found in your class",
        });
      }
    }

    // ── BUILD FILTER ──────────────────────────────
    const filter = { schoolId };

    // teacher scope
    if (allowedStudentIds) {
      filter.studentId = { $in: allowedStudentIds };
    }

    // status filter
    if (status && status !== "all") {
      filter.status = status;
    }

    // date filter
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.exitDate = { $gte: start, $lte: end };
    }

    // class filter — admin only
    if (classId && role !== "teacher_admin") {
      // get students in this class
      const students = await Student
        .find({ schoolId, classId })
        .select("_id");
      filter.studentId = { $in: students.map((s) => s._id) };
    }

    // section filter — admin only
    if (sectionId && role !== "teacher_admin") {
      const students = await Student
        .find({ schoolId, sectionId })
        .select("_id");
      filter.studentId = { $in: students.map((s) => s._id) };
    }

    // fetch gatepasses
    let gatepasses = await GatePass
      .find(filter)
      .populate("studentId", "firstName lastName studentId classId sectionId")
      .sort({ createdAt: -1 });

    // search by student, pickup, code or ID number — after populate
    if (search?.trim()) {
      const q = search.toLowerCase();
      gatepasses = gatepasses.filter((g) => {
        const values = [
          `${g.studentId?.firstName || ""} ${g.studentId?.lastName || ""}`,
          g.passCode,
          g.pickupPerson?.name,
          g.pickupPerson?.idProofNumber,
        ];
        return values.some((value) => String(value || "").toLowerCase().includes(q));
      });
    }

    return res.json({
      success: true,
      data: gatepasses,
    });

  } catch (error) {
    next(error);
  }
};

/* ═══════════════════════════════════════════════════
   4. ACTION — approve or reject
   teacher_admin | school_admin | staff_admin
═══════════════════════════════════════════════════ */
export const verifyGatePassCode = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const rawCode = readablePassCode(
      req.body.code || req.params.code || req.query.code
    );
    const code = normalizePassCode(rawCode);

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Scan the barcode or enter the pickup code",
      });
    }

    // accepts GP-20261121-XXXXXXXX, GP20261121XXXXXXXX,
    // and spacing variants produced by manual typing or scanners
    const spacedPattern = new RegExp(
      `^${code.split("").join("[^A-Z0-9]*")}$`,
      "i"
    );

    const gatepass = await GatePass
      .findOne({
        schoolId,
        $or: [
          { passCode: rawCode },
          { passCode: spacedPattern },
          { barcodeValue: rawCode },
          { barcodeValue: code },
        ],
      })
      .populate("studentId", "firstName lastName studentId classId sectionId");

    if (!gatepass) {
      return res.status(404).json({
        success: false,
        message: "No gate pass found for this code",
      });
    }

    if (gatepass.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `This gate pass is already ${gatepass.status}`,
        data: gatepass,
      });
    }

    // teachers can only verify gatepasses from their own class
    if (req.user.role === "teacher_admin") {
      const teacherId = req.user.teacher_id;
      const classes = await Class.find({
        schoolId,
        "details.teacherId": teacherId,
        "details.sectionId": gatepass.studentId?.sectionId,
      });

      if (!classes.length) {
        return res.status(403).json({
          success: false,
          message: "You are not the class teacher of this student",
        });
      }
    }

    gatepass.verified         = true;
    gatepass.verifiedAt       = new Date();
    gatepass.verifiedBy       = req.user._id;
    gatepass.verifiedByName   = req.user.name;
    gatepass.verifiedByRole   = req.user.role;
    gatepass.verificationNote = "Pickup barcode/code verified at school";
    await gatepass.save();

    return res.json({
      success: true,
      message: "Pickup barcode/code verified successfully",
      data: gatepass,
    });
  } catch (error) {
    next(error);
  }
};

export const actionGatePass = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const { action, note } = req.body;
    // action must be "approved" or "rejected"

    // ── 1. VALIDATE ACTION ────────────────────────
    if (!["approved", "rejected"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action must be 'approved' or 'rejected'",
      });
    }

    if (action === "rejected" && !note?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide a reason for rejection",
      });
    }

    // ── 2. FIND GATEPASS ──────────────────────────
    const gatepass = await GatePass.findOne({
      _id:      req.params.id,
      schoolId,
    }).populate("studentId", "firstName lastName");

    if (!gatepass) {
      return res.status(404).json({
        success: false,
        message: "Gate pass not found",
      });
    }

    // ── 3. ONLY PENDING CAN BE ACTIONED ──────────
    if (gatepass.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Gate pass is already ${gatepass.status}`,
      });
    }

    // ── 4. TEACHER SCOPE CHECK ────────────────────
    // teacher can only action gatepasses from their class
    if (req.user.role === "teacher_admin") {
      const teacherId = req.user.teacher_id;

      const student = await Student
        .findById(gatepass.studentId)
        .select("sectionId");

      const classes = await Class.find({
        schoolId,
        "details.teacherId": teacherId,
        "details.sectionId": student?.sectionId,
      });

      if (!classes.length) {
        return res.status(403).json({
          success: false,
          message: "You are not the class teacher of this student",
        });
      }
    }

    // ── VERIFY BEFORE APPROVAL ────────────────────
    // Legacy passes without a code can still be actioned normally.
    if (action === "approved" && gatepass.passCode && !gatepass.verified) {
      return res.status(400).json({
        success: false,
        message: "Verify the pickup barcode or code before approving",
      });
    }

    // ── 5. UPDATE GATEPASS ────────────────────────
    gatepass.status       = action;
    gatepass.actionBy     = req.user._id;
    gatepass.actionByName = req.user.name;
    gatepass.actionByRole = req.user.role;
    gatepass.actionNote   = note || null;
    gatepass.actionAt     = new Date();

    await gatepass.save();

    // ── 6. NOTIFY PARENT ──────────────────────────
    try {
      const studentName = `${gatepass.studentId?.firstName} ${gatepass.studentId?.lastName}`;
      const actionWord  = action === "approved" ? "Approved" : "Rejected";

      await createNotificationHelper({
        title:            `Gate Pass ${actionWord}`,
        message:          `Gate pass for ${studentName} has been ${action}${action === "rejected" ? `. Reason: ${note}` : "."}`,
        notificationType: "gatepass",
        eventType:        "PARENT.GATE_PASS",
        schoolId,
        targets: [
          {
            type:      "student",
            studentId: gatepass.studentId._id,
            schoolId,
          },
        ],
        systemKey: `gatepass:${gatepass._id}:${action}`,
        payloadExtras: {
          studentId: gatepass.studentId._id,
          studentName,
          message: `Gate pass ${action}`,
          status: action,
        },
      });
    } catch (notifErr) {
      console.error("Notification error:", notifErr);
    }

    return res.json({
      success: true,
      message: `Gate pass ${action} successfully`,
      data: gatepass,
    });

  } catch (error) {
    next(error);
  }
};

/* ═══════════════════════════════════════════════════
   5. CANCEL — parent cancels pending gatepass
═══════════════════════════════════════════════════ */
export const cancelGatePass = async (req, res, next) => {
  try {
    const studentId = req.user.student_id;
    const schoolId  = req.user.school_id;

    // ── 1. FIND GATEPASS ──────────────────────────
    const gatepass = await GatePass.findOne({
      _id:      req.params.id,
      studentId,
      schoolId,
    }).populate("studentId", "firstName lastName sectionId");

    if (!gatepass) {
      return res.status(404).json({
        success: false,
        message: "Gate pass not found",
      });
    }

    // ── 2. ONLY PENDING CAN BE CANCELLED ─────────
    if (gatepass.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a gate pass that is already ${gatepass.status}`,
      });
    }

    // ── 3. CANCEL ─────────────────────────────────
    gatepass.status      = "cancelled";
    gatepass.cancelledAt = new Date();
    await gatepass.save();

    // ── 4. NOTIFY CLASS TEACHER + SCHOOL ADMIN ────
    try {
      const student     = gatepass.studentId;
      const studentName = `${student?.firstName} ${student?.lastName}`;
      const teacherIds  = await getClassTeacherIds(schoolId, student?.sectionId);

      const targets = [
        {
          type:  "role",
          roles: ["school_admin"],
          schoolId,
        },
        ...teacherIds.map((tid) => ({
          type:      "teacher",
          teacherId: tid,
          schoolId,
        })),
      ];

      await createNotificationHelper({
        title:            "Gate Pass Cancelled",
        message:          `Gate pass request for ${studentName} has been cancelled by parent.`,
        notificationType: "gatepass",
        eventType:        "PARENT.GATE_PASS",
        schoolId,
        targets,
        systemKey: `gatepass:${gatepass._id}:cancelled`,
        payloadExtras: { studentName, message: "Gate pass cancelled", status: "cancelled" },
      });
    } catch (notifErr) {
      console.error("Notification error:", notifErr);
    }

    return res.json({
      success: true,
      message: "Gate pass cancelled successfully",
      data: gatepass,
    });

  } catch (error) {
    next(error);
  }
};