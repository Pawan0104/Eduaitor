import Student from "../models/student.js";
import Staff from "../models/staff.js";
import School from "../models/school.js";

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

const ensureStaffIdCard = async (staff) => {
  if (!staff.idCardIssuedAt) {
    staff.idCardIssuedAt = staff.joiningDate || staff.createdAt || new Date();
    await Staff.updateOne(
      { _id: staff._id },
      { $set: { idCardIssuedAt: staff.idCardIssuedAt } },
    );
  }
  return staff;
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

    return res.json({
      success: true,
      type: "student",
      school,
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

    let staff = await Staff.findOne({ _id: staffId, schoolId }).lean();
    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff not found" });
    }

    staff = await ensureStaffIdCard(staff);
    const school = await getSchoolCard(schoolId);

    const roleLabel =
      staff.staffRole === "other"
        ? staff.staffRoleCustom || "Staff"
        : staff.staffRole
          ? staff.staffRole.charAt(0).toUpperCase() + staff.staffRole.slice(1)
          : "Staff";

    return res.json({
      success: true,
      type: "staff",
      school,
      person: {
        _id: staff._id,
        name: staff.fullName,
        idNumber: staff.staffId,
        photo: staff.photo?.url || "",
        roleLabel,
        email: staff.email || "—",
        phone: staff.phone || "—",
        dob: staff.dob || null,
        gender: staff.gender || "—",
        address: staff.address || "—",
        employmentType: staff.employmentType || "—",
        joiningDate: staff.joiningDate || null,
        issuedAt: staff.idCardIssuedAt,
        validSession: staff.joiningDate
          ? new Date(staff.joiningDate).getFullYear()
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
