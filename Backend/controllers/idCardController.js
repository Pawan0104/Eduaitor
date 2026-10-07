import Student from "../models/student.js";
import Staff from "../models/staff.js";
import Teacher from "../models/teacher.js";
import { Driver } from "../models/transport.js";
import School from "../models/school.js";
import { getDocumentDesign } from "./certificateController.js";

const getSchoolCard = async (schoolId) => {
  const school = await School.findById(schoolId)
    .select("school_name school_logo address contact_phone contact_email")
    .lean();
  if (!school) return null;
  return {
    name: school.school_name || "",
    logo: school.school_logo || "",
    address: school.address || "",
    phone: school.contact_phone || "",
    email: school.contact_email || "",
  };
};

const ensureStudentIdCard = async (student) => {
  if (!student.idCardIssuedAt) {
    student.idCardIssuedAt = student.admissionDate || student.createdAt || new Date();
    await Student.updateOne(
      { _id: student._id },
      { $set: { idCardIssuedAt: student.idCardIssuedAt } },
    );
  }
  return student;
};

/**
 * Staff-facing ID cards are rendered for three separate collections.
 * The caller says which one via `?model=`; "staff" remains the default so
 * existing links and self-service cards keep working unchanged.
 */
const STAFF_CARD_MODELS = {
  staff: {
    Model: Staff,
    personType: "staff",
    label: "Staff member",
    idField: "staffId",
    nameField: "fullName",
  },
  teacher: {
    Model: Teacher,
    personType: "teacher",
    label: "Teacher",
    idField: "teacherId",
    nameField: "fullName",
  },
  driver: {
    Model: Driver,
    personType: "driver",
    label: "Driver",
    idField: "driverId",
    nameField: "name",
  },
};

const resolveStaffCardModel = (raw) => {
  const key = String(raw || "staff").trim().toLowerCase();
  return STAFF_CARD_MODELS[key] || STAFF_CARD_MODELS.staff;
};

const ensureStaffIdCard = async (person, spec) => {
  if (!person.idCardIssuedAt) {
    person.idCardIssuedAt = person.joiningDate || person.createdAt || new Date();
    await spec.Model.updateOne(
      { _id: person._id },
      { $set: { idCardIssuedAt: person.idCardIssuedAt } },
    );
  }
  return person;
};

/** GET /id-card/student/:id — school/teacher/parent; or omit id for logged-in student */
export const getStudentIdCard = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const role = req.user?.role;
    let studentId = req.params.id;

    if (!schoolId) {
      return res.status(403).json({ success: false, message: "School not identified" });
    }

    if (!studentId) {
      if (role === "student_admin" && req.user.student_id) {
        studentId = req.user.student_id;
      } else {
        return res.status(400).json({ success: false, message: "Student id required" });
      }
    }

    // Parent/student can only view their linked student
    if (
      role === "student_admin" &&
      String(req.user.student_id) !== String(studentId)
    ) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    let student = await Student.findOne({ _id: studentId, schoolId })
      .populate("classId", "name")
      .populate("sectionId", "name")
      .populate("houseId", "name color")
      .lean();

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    student = await ensureStudentIdCard(student);
    const school = await getSchoolCard(schoolId);
    const design = await getDocumentDesign(schoolId, "id_card");
    if (design?.logoUrl && school) school.logo = design.logoUrl;

    return res.json({
      success: true,
      type: "student",
      school,
      design,
      person: {
        _id: student._id,
        name: `${student.firstName} ${student.lastName || ""}`.trim(),
        idNumber: student.studentId,
        photo: student.documents?.studentPhoto?.url || "",
        roleLabel: "Student",
        className: student.classId?.name || "—",
        sectionName: student.sectionId?.name || "—",
        rollNo: student.rollNo || "—",
        dob: student.dob || null,
        bloodGroup: student.bloodGroup || "—",
        gender: student.gender || "—",
        fatherName: student.fatherName || "—",
        motherName: student.motherName || "—",
        address: student.address || "—",
        house: student.houseId?.name || null,
        houseColor: student.houseId?.color || null,
        issuedAt: student.idCardIssuedAt,
        validSession: student.admissionDate
          ? new Date(student.admissionDate).getFullYear()
          : new Date().getFullYear(),
      },
    });
  } catch (err) {
    console.error("getStudentIdCard:", err);
    return res.status(500).json({ success: false, message: "Failed to load ID card" });
  }
};

/** GET /id-card/staff/:id — school admin; or omit id for logged-in staff */
export const getStaffIdCard = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const role = req.user?.role;
    let staffId = req.params.id;

    if (!schoolId) {
      return res.status(403).json({ success: false, message: "School not identified" });
    }

    if (!staffId) {
      if (role === "staff_admin" && req.user.staff_id) {
        staffId = req.user.staff_id;
      } else {
        return res.status(400).json({ success: false, message: "Staff id required" });
      }
    }

    const canManageStaff = ["school_admin", "super_admin"].includes(role);
    const isOwnCard =
      role === "staff_admin" &&
      String(req.user.staff_id) === String(staffId);
    const perms = Array.isArray(req.user?.permissions)
      ? req.user.permissions
      : [];
    // Staff with staff module access (or administrator) may open any school staff card
    const isStaffManager =
      role === "staff_admin" &&
      (req.user.staffRole === "administrator" ||
        perms.includes("staff") ||
        perms.includes("all"));

    if (!canManageStaff && !isOwnCard && !isStaffManager) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const spec = resolveStaffCardModel(req.query.model);

    let person = await spec.Model.findOne({ _id: staffId, schoolId }).lean();
    if (!person) {
      return res
        .status(404)
        .json({ success: false, message: `${spec.label} not found` });
    }

    person = await ensureStaffIdCard(person, spec);
    const school = await getSchoolCard(schoolId);
    const design = await getDocumentDesign(schoolId, "id_card");
    if (design?.logoUrl && school) school.logo = design.logoUrl;

    const roleLabel =
      spec.personType === "teacher"
        ? person.designation || "Teacher"
        : spec.personType === "driver"
          ? "Driver"
          : person.staffRole === "other"
            ? person.staffRoleCustom || "Staff"
            : person.staffRole
              ? person.staffRole.charAt(0).toUpperCase() + person.staffRole.slice(1)
              : "Staff";

    return res.json({
      success: true,
      type: "staff",
      personType: spec.personType,
      school,
      design,
      person: {
        _id: person._id,
        name: person[spec.nameField] || "",
        idNumber: person[spec.idField] || "",
        photo: person.photo?.url || "",
        roleLabel,
        email: person.email || "—",
        phone: person.phone || "—",
        dob: person.dob || null,
        gender: person.gender || "—",
        address: person.address || "—",
        employmentType: person.employmentType || "—",
        joiningDate: person.joiningDate || null,
        issuedAt: person.idCardIssuedAt,
        validSession: person.joiningDate
          ? new Date(person.joiningDate).getFullYear()
          : new Date().getFullYear(),
      },
    });
  } catch (err) {
    console.error("getStaffIdCard:", err);
    return res.status(500).json({ success: false, message: "Failed to load ID card" });
  }
};

/** GET /id-card/me — current student or staff card */
export const getMyIdCard = async (req, res) => {
  const role = req.user?.role;
  if (role === "student_admin") {
    req.params.id = req.user.student_id;
    return getStudentIdCard(req, res);
  }
  if (role === "staff_admin") {
    req.params.id = req.user.staff_id;
    return getStaffIdCard(req, res);
  }
  return res.status(400).json({
    success: false,
    message: "ID card is available for students and staff only",
  });
};
