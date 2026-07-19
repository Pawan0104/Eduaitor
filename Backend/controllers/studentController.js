import mongoose from "mongoose";
import Student from "../models/student.js";
import Lead from "../models/lead.js";
import Group from "../models/group.js";
import Teacher from "../models/teacher.js";
import Class from "../models/class.js";
import School from "../models/school.js";
import House from "../models/house.js";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";
import { deleteFromCloudinary } from "../utils/deleteFromCloudinary.js";
import {
  syncStudentGroups,
  removeStudentFromOldGroups,
} from "../utils/groupSync.js";
import { ensureDefaultHouses } from "../utils/ensureDefaultHouses.js";
import bcrypt from "bcryptjs";

const normalizeStudentFeeFields = (safeBody) => {
  if (safeBody.transport === "") {
    safeBody.transport = null;
  }

  if (typeof safeBody.selectedOptionalFees === "string") {
    try {
      safeBody.selectedOptionalFees = JSON.parse(safeBody.selectedOptionalFees);
    } catch {
      safeBody.selectedOptionalFees = [];
    }
  }

  if (!Array.isArray(safeBody.selectedOptionalFees)) {
    safeBody.selectedOptionalFees = [];
  }

  safeBody.busFeeFrequency =
    safeBody.busFeeFrequency === "quarterly" ? "quarterly" : "annually";
  safeBody.busFeeQuarter =
    safeBody.busFeeFrequency === "quarterly"
      ? safeBody.busFeeQuarter || ""
      : "";
};

/* ================= GENERATE STUDENT ID ================= */

const generateStudentId = async (schoolId) => {
  const count = await Student.countDocuments({ schoolId });

  const next = count + 1;

  return `STU${String(next).padStart(4, "0")}`;
};

/* ================= CREATE STUDENT ================= */

export const createStudent = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const { ...safeBody } = req.body;
    normalizeStudentFeeFields(safeBody);

    const totalDue = Number(safeBody.finalFee) || 0;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: "School ID is required",
      });
    }

    const rawFiles = req.files || [];
    const files = Array.isArray(rawFiles)
      ? rawFiles.reduce((acc, file) => {
          const field = file.fieldname;
          acc[field] = acc[field] || [];
          acc[field].push(file);
          return acc;
        }, {})
      : rawFiles;

    const documents = {};

    const uploadFile = async (field, folder) => {
      try {
        if (!files[field] || !files[field][0]) return;

        const uploaded = await uploadToCloudinary(files[field][0], folder);

        documents[field] = {
          url: uploaded.url,
          public_id: uploaded.public_id,
          type: uploaded.type,
        };
      } catch (err) {
        console.error(`Upload failed for ${field}`, err);
      }
    };

    const parseExtraDocumentsMeta = () => {
      if (!safeBody.extraDocumentsMeta) return [];

      try {
        return JSON.parse(safeBody.extraDocumentsMeta).map((doc) => ({
          fieldName: doc.fieldName,
          label: doc.label || "",
        }));
      } catch {
        return [];
      }
    };

    // Upload images
    await uploadFile("studentPhoto", "students");
    await uploadFile("fatherPhoto", "students");
    await uploadFile("motherPhoto", "students");
    await uploadFile("guardianPhoto", "students");

    // Upload documents
    await uploadFile("birthCertificate", "documents");
    await uploadFile("transferCertificate", "documents");

    await uploadFile("studentAadhar", "documents");
    await uploadFile("fatherAadhar", "documents");
    await uploadFile("motherAadhar", "documents");

    const extraDocumentsMeta = parseExtraDocumentsMeta();
    delete safeBody.extraDocumentsMeta;
    const extraDocuments = [];

    for (const docMeta of extraDocumentsMeta) {
      const field = docMeta.fieldName;
      if (!files[field] || !files[field][0]) continue;

      try {
        const uploaded = await uploadToCloudinary(files[field][0], "documents");
        extraDocuments.push({
          fieldName: field,
          label: docMeta.label || "",
          url: uploaded.url,
          public_id: uploaded.public_id,
          type: uploaded.type,
        });
      } catch (err) {
        console.error(`Upload failed for extra document ${field}`, err);
      }
    }

    const studentUsernameExists = await Student.findOne({
      schoolId,
      "studentCredentials.username": safeBody.username, // username field from form
    });
    if (studentUsernameExists) {
      return res
        .status(400)
        .json({ success: false, message: "Student username already exists" });
    }

    const studentId = await generateStudentId(schoolId);

    // ── HASH PASSWORD (same password used for both, set at creation) ──
    const rawPassword = safeBody.password?.trim();
    const hashedPassword = rawPassword
      ? await bcrypt.hash(rawPassword, 10)
      : undefined;

    // ── BUILD CREDENTIAL OBJECTS ──
    const studentCredentials = {
      username: studentId, // STU0001 — auto generated
      password: hashedPassword,
      temp_password: rawPassword || undefined,
      firstTimeLogin: true,
    };

    const parentCredentials = {
      username: safeBody.fatherMobile || "", // father mobile as username
      password: hashedPassword, // same initial password
      temp_password: rawPassword || undefined,
      firstTimeLogin: true,
    };

    // ── STRIP OLD TOP-LEVEL CREDENTIAL FIELDS ──
    delete safeBody.username;
    delete safeBody.password;
    delete safeBody.temp_password;
    delete safeBody.firstTimeLogin;

    const leadIdRaw = safeBody.leadId || safeBody.convertedFromLeadId || null;
    delete safeBody.leadId;
    delete safeBody.convertedFromLeadId;

    let convertedFromLeadId = null;
    if (leadIdRaw) {
      if (!mongoose.Types.ObjectId.isValid(leadIdRaw)) {
        return res.status(400).json({
          success: false,
          message: "Invalid lead reference",
        });
      }

      const leadQuery = { _id: leadIdRaw, schoolId };
      if (req.user?.role === "staff_admin" && req.user?.staff_id) {
        leadQuery["assignedTo.userType"] = "staff";
        leadQuery["assignedTo.userId"] = req.user.staff_id;
      }

      const lead = await Lead.findOne(leadQuery);
      if (!lead) {
        return res.status(404).json({
          success: false,
          message: "Lead not found or not assigned to you",
        });
      }
      if (lead.studentId) {
        return res.status(400).json({
          success: false,
          message: "This lead has already been converted to a student",
        });
      }
      if (String(lead.status || "").toLowerCase() === "cancelled") {
        return res.status(400).json({
          success: false,
          message: "Cancelled leads cannot be admitted",
        });
      }
      convertedFromLeadId = lead._id;
    }

    // Auto-assign a random active house when school uses House Allocation
    let houseId = safeBody.houseId || null;
    if (!houseId) {
      try {
        const school = await School.findById(schoolId)
          .select("subscribed_modules")
          .lean();
        if (school?.subscribed_modules?.includes("house")) {
          await ensureDefaultHouses(schoolId);
          const houses = await House.find({
            schoolId,
            status: "Active",
          }).select("_id");
          if (houses.length > 0) {
            houseId = houses[Math.floor(Math.random() * houses.length)]._id;
          }
        }
      } catch {
        /* non-blocking */
      }
    }

    const student = await Student.create({
      ...safeBody,
      schoolId,
      studentId,
      totalDue,
      totalPaid: 0,
      documents,
      extraDocuments,
      studentCredentials,
      parentCredentials,
      houseId,
      idCardIssuedAt: new Date(),
      convertedFromLeadId,
    });

    if (convertedFromLeadId) {
      await Lead.findOneAndUpdate(
        {
          _id: convertedFromLeadId,
          schoolId,
          $or: [{ studentId: null }, { studentId: { $exists: false } }],
        },
        { $set: { status: "admitted", studentId: student._id } },
      );
    }

    // AUTO ADD TO GROUPS
    await syncStudentGroups(student);

    res.status(201).json({
      success: true,
      message: "Student created successfully. ID card is ready to download.",
      data: student,
      idCardReady: true,
    });
  } catch (error) {
    console.error("Create student error:", error);

    if (error?.code === 11000 && error?.keyPattern?.convertedFromLeadId) {
      return res.status(400).json({
        success: false,
        message: "This lead has already been converted to a student",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Failed to create student",
    });
  }
};

/* ================= GET ALL STUDENTS ================= */

export const getStudents = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: "School ID is required",
      });
    }

    const students = await Student.find({ schoolId })
      .populate("classId", "name className")
      .populate("sectionId", "name sectionName")
      .populate("transport", "name routeId")
      .populate("houseId", "name code color")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: students,
    });
  } catch (error) {
    console.error("Get students error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch students",
    });
  }
};

/* ================= GET SINGLE STUDENT ================= */

export const getStudent = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: "School ID is required",
      });
    }

    const student = await Student.findOne({
      _id: req.params.id,
      schoolId,
    })
      .populate("classId", "name className")
      .populate("sectionId", "name sectionName")
      .populate("transport", "name routeId");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    res.json({
      success: true,
      data: student,
    });
  } catch (error) {
    console.error("Get student error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch student",
    });
  }
};

/* ================= UPDATE STUDENT ================= */

export const updateStudent = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const { ...safeBody } = req.body;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: "School ID is required",
      });
    }

    normalizeStudentFeeFields(safeBody);

    const student = await Student.findOne({
      _id: req.params.id,
      schoolId,
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const oldStudent = student.toObject(); // Reference for group sync

    const rawFiles = req.files || [];
    const files = Array.isArray(rawFiles)
      ? rawFiles.reduce((acc, file) => {
          const field = file.fieldname;
          acc[field] = acc[field] || [];
          acc[field].push(file);
          return acc;
        }, {})
      : rawFiles;

    const documents = student.documents || {};
    const extraDocuments = student.extraDocuments || [];

    const updateFile = async (field, folder) => {
      if (files[field] && files[field][0]) {
        // Delete old file
        if (documents[field]?.public_id) {
          await deleteFromCloudinary(documents[field].public_id);
        }

        const uploaded = await uploadToCloudinary(files[field][0], folder);

        documents[field] = {
          url: uploaded.url,
          public_id: uploaded.public_id,
          type: uploaded.type,
        };
      }
    };

    const parseExtraDocumentsMeta = () => {
      if (!safeBody.extraDocumentsMeta) return [];

      try {
        return JSON.parse(safeBody.extraDocumentsMeta).map((doc) => ({
          fieldName: doc.fieldName,
          label: doc.label || "",
        }));
      } catch {
        return [];
      }
    };

    // Update images
    await updateFile("studentPhoto", "students");
    await updateFile("fatherPhoto", "students");
    await updateFile("motherPhoto", "students");
    await updateFile("guardianPhoto", "students");

    // Update documents
    await updateFile("birthCertificate", "documents");
    await updateFile("transferCertificate", "documents");

    await updateFile("studentAadhar", "documents");
    await updateFile("fatherAadhar", "documents");
    await updateFile("motherAadhar", "documents");

    const extraDocumentsMeta = parseExtraDocumentsMeta();
    delete safeBody.extraDocumentsMeta;
    const newExtraDocuments = [];

    for (const docMeta of extraDocumentsMeta) {
      const field = docMeta.fieldName;
      if (!files[field] || !files[field][0]) continue;

      try {
        const uploaded = await uploadToCloudinary(files[field][0], "documents");
        newExtraDocuments.push({
          fieldName: field,
          label: docMeta.label || "",
          url: uploaded.url,
          public_id: uploaded.public_id,
          type: uploaded.type,
        });
      } catch (err) {
        console.error(`Upload failed for extra document ${field}`, err);
      }
    }

    // ── STRIP OLD TOP-LEVEL CREDENTIAL FIELDS ──
    delete safeBody.username;
    delete safeBody.firstTimeLogin;

    // ── BUILD SEPARATE $set FOR NESTED CREDENTIAL FIELDS ──
    const credentialUpdate = {};

    if (safeBody.password && safeBody.password.trim() !== "") {
      const rawPassword = safeBody.password.trim();
      const hashedPassword = await bcrypt.hash(rawPassword, 10);

      credentialUpdate["studentCredentials.password"] = hashedPassword;
      credentialUpdate["studentCredentials.temp_password"] = rawPassword;
      credentialUpdate["parentCredentials.password"] = hashedPassword;
      credentialUpdate["parentCredentials.temp_password"] = rawPassword;
    }

    // Sync parent username if fatherMobile changed
    if (safeBody.fatherMobile) {
      credentialUpdate["parentCredentials.username"] = safeBody.fatherMobile;
    }

    // ── STRIP password from safeBody so it doesn't conflict ──
    delete safeBody.password;
    delete safeBody.temp_password;

    // ── ALSO STRIP any nested credential objects if accidentally in safeBody ──
    delete safeBody.studentCredentials;
    delete safeBody.parentCredentials;

    const totalPaid = Number(student.totalPaid) || 0;
    const finalFee = Number(safeBody.finalFee);

    const updatedStudent = await Student.findOneAndUpdate(
      { _id: req.params.id, schoolId },
      {
        ...safeBody,
        ...(Number.isFinite(finalFee)
          ? {
              totalDue: Math.max(0, finalFee - totalPaid),
            }
          : {}),
        documents,
        extraDocuments: [...extraDocuments, ...newExtraDocuments],
        ...credentialUpdate,
      },
      { new: true },
    )
      .populate("classId", "name className")
      .populate("sectionId", "name sectionName")
      .populate("transport", "name routeId");

    const classChanged =
      oldStudent.classId?.toString() !== updatedStudent.classId?.toString();

    const sectionChanged =
      oldStudent.sectionId?.toString() !== updatedStudent.sectionId?.toString();

    if (classChanged || sectionChanged) {
      // remove from old groups
      await removeStudentFromOldGroups(oldStudent);

      // add to new groups
      await syncStudentGroups(updatedStudent);
    }

    res.json({
      success: true,
      message: "Student updated successfully",
      data: updatedStudent,
    });
  } catch (error) {
    console.error("Update student error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to update student",
    });
  }
};

/* ================= DELETE STUDENT ================= */

export const deleteStudent = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: "School ID is required",
      });
    }

    const student = await Student.findOne({
      _id: req.params.id,
      schoolId,
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const docs = student.documents || {};

    // Delete all files from Cloudinary
    for (const key in docs) {
      if (docs[key]?.public_id) {
        await deleteFromCloudinary(docs[key].public_id);
      }
    }

    await Group.updateMany(
      {
        schoolId,
        "members.userId": student._id,
      },
      {
        $pull: {
          members: { userId: student._id },
        },
      },
    );

    await student.deleteOne();

    res.json({
      success: true,
      message: "Student deleted successfully",
    });
  } catch (error) {
    console.error("Delete student error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete student",
    });
  }
};

/* ================= GET ALL STUDENTS FOR SUPER ADMIN ================= */
export const getAllStudents = async (req, res) => {
  try {
    if (req.user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const schoolId = req.query.schoolId;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: "School ID is required",
      });
    }

    const students = await Student.find({ schoolId })
      .populate("classId", "name className")
      .populate("sectionId", "name sectionName")
      .populate("transport", "name routeId")
      .populate("houseId", "name code color")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: students,
    });
  } catch (error) {
    console.error("Get students error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch students",
    });
  }
};

/* ================= GET STUDENTS FOR TEACHER ================= */
export const getStudentsByTeacher = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const rawTeacherId = req.user?.teacher_id;

    if (!schoolId || !rawTeacherId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing credentials" });
    }

    const teacherObjId = new mongoose.Types.ObjectId(rawTeacherId);
    const schoolObjId = new mongoose.Types.ObjectId(schoolId);

    // Source 1 & 2: classes where teacher appears in details.teacherId OR subjectTeachers
    const classesFromClassDoc = await Class.find({
      schoolId: schoolObjId,
      $or: [
        { "details.teacherId": teacherObjId },
        { "details.subjectTeachers.teacherId": teacherObjId },
      ],
    }).select("_id");

    // Source 3: Teacher.assignedClasses[]
    const teacher =
      await Teacher.findById(teacherObjId).select("assignedClasses");

    if (!teacher) {
      return res
        .status(404)
        .json({ success: false, message: "Teacher not found" });
    }

    // Merge and deduplicate all class IDs
    const allClassIds = new Set([
      ...classesFromClassDoc.map((c) => c._id.toString()),
      ...(teacher.assignedClasses || []).map((id) => id.toString()),
    ]);

    if (allClassIds.size === 0) {
      return res.json({ success: true, data: [], assignedClasses: [] });
    }

    const classIdArray = [...allClassIds].map(
      (id) => new mongoose.Types.ObjectId(id),
    );

    // Fetch students in those classes
    const students = await Student.find({
      schoolId: schoolObjId,
      classId: { $in: classIdArray },
    })
      .populate("classId", "name")
      .populate("sectionId", "name")
      .sort({ createdAt: -1 });

    // Fetch all class docs for the dropdown (includes empty classes)
    const allClassDocs = await Class.find({
      _id: { $in: classIdArray },
    })
      .select("_id name")
      .sort({ name: 1 });

    res.json({
      success: true,
      data: students,
      assignedClasses: allClassDocs,
    });
  } catch (error) {
    console.error("getStudentsByTeacher error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};