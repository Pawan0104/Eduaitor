import Staff from "../models/staff.js";
import Teacher from "../models/teacher.js";
import School from "../models/school.js";
import bcrypt from "bcryptjs";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";
import { MODULE_KEYS } from "../constants/module.js";

/* ── HELPER — auto generate staffId ─────────────────
   Finds highest existing staffId in school and increments
   e.g. STF001, STF002, STF003...
─────────────────────────────────────────────────────*/
const generateStaffId = async (schoolId) => {
  const last = await Staff
    .findOne({ schoolId })
    .sort({ createdAt: -1 })
    .select("staffId");

  if (!last?.staffId) return "STF001";

  const num = parseInt(last.staffId.replace("STF", ""), 10);
  return `STF${String(num + 1).padStart(3, "0")}`;
};

/* ── HELPER — auto generate username ────────────────
   firstname + last 3 digits of staffId
   e.g. john001
─────────────────────────────────────────────────────*/
const generateUsername = (fullName, staffId) => {
  const first = fullName.split(" ")[0].toLowerCase().replace(/[^a-z]/g, "");
  const suffix = staffId.slice(-3);
  return `${first}${suffix}`;
};

/* ---------------- CREATE STAFF ---------------- */
export const createStaff = async (req, res, next) => {
  try {
    const {
      fullName,
      email,
      phone,
      dob,
      gender,
      address,
      staffRole,
      staffRoleCustom,
      joiningDate,
      employmentType,
      salary,
      permissions,  // JSON string from FormData
      password,
      status,
    } = req.body;

    // ── 1. GET SCHOOL ID FROM AUTH ────────────────
    // works for both school_admin and administrator staff
    const schoolId = req.user.school_id;

    // ── 2. VALIDATE REQUIRED ──────────────────────
    if (!fullName?.trim())  return res.status(400).json({ success: false, message: "Full name is required" });
    if (!email?.trim())     return res.status(400).json({ success: false, message: "Email is required" });
    if (!staffRole)         return res.status(400).json({ success: false, message: "Staff role is required" });
    if (!password?.trim())  return res.status(400).json({ success: false, message: "Password is required" });
    if (staffRole === "other" && !staffRoleCustom?.trim()) {
      return res.status(400).json({ success: false, message: "Please specify the custom role" });
    }

    // ── 3. CHECK EMAIL UNIQUE IN SCHOOL ───────────
    const exists = await Staff.findOne({ schoolId, email });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "A staff member with this email already exists in your school",
      });
    }

    // ── 4. PARSE + VALIDATE PERMISSIONS ──────────
    let parsedPermissions = [];
    if (permissions) {
      try {
        parsedPermissions = JSON.parse(permissions);
      } catch {
        return res.status(400).json({ success: false, message: "Invalid permissions format" });
      }
    }

    // validate each permission key is real
    const invalidPerms = parsedPermissions.filter((p) => !MODULE_KEYS.includes(p));
    if (invalidPerms.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid permission(s): ${invalidPerms.join(", ")}`,
      });
    }

    // ── 5. VALIDATE PERMISSIONS AGAINST SCHOOL ────
    // staff can only be given modules the school has subscribed to
    const school = await School
      .findById(schoolId)
      .select("subscribed_modules");

    const invalidForSchool = parsedPermissions.filter(
      (p) => !school.subscribed_modules.includes(p)
    );
    if (invalidForSchool.length > 0) {
      return res.status(400).json({
        success: false,
        message: `School has not subscribed to: ${invalidForSchool.join(", ")}`,
      });
    }

    // ── 6. GENERATE IDs ───────────────────────────
    const staffId  = await generateStaffId(schoolId);
    const username = generateUsername(fullName, staffId);

    // ── 7. HASH PASSWORD ──────────────────────────
    const hashedPassword = await bcrypt.hash(password, 10);

    // ── 8. HANDLE PHOTO ───────────────────────────
    let photo = null;
    if (req.file) {
      const uploaded = await uploadToCloudinary(req.file, "staff");
      photo = {
        url:       uploaded.url,
        public_id: uploaded.public_id,
        type:      req.file.mimetype,
      };
    }

    // ── 9. CREATE ─────────────────────────────────
    const staff = await Staff.create({
      fullName,
      email,
      phone,
      dob:            dob        || null,
      gender,
      address,
      staffRole,
      staffRoleCustom: staffRole === "other" ? staffRoleCustom : null,
      joiningDate:    joiningDate || null,
      employmentType: employmentType || "Full-Time",
      salary:         salary     || null,
      permissions:    parsedPermissions,
      staffId,
      username,
      password:       hashedPassword,
      temp_password:  password,
      status:         status     || "Active",
      photo,
      schoolId,
      idCardIssuedAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: "Staff member created successfully. ID card is ready to download.",
      data: staff,
      idCardReady: true,
    });

  } catch (error) {
    next(error);
  }
};

/* ---------------- GET ALL STAFF ---------------- */
export const getStaff = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;

    const [staff, teachers] = await Promise.all([
      Staff.find({ schoolId })
        .select("-password -temp_password")
        .sort({ createdAt: -1 })
        .lean(),
      Teacher.find({ schoolId })
        .select("-password -temp_password")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const teacherItems = teachers.map((teacher) => ({
      ...teacher,
      staffRole: "teacher",
      staffRoleCustom: null,
      staffId: teacher.teacherId,
      permissions: teacher.permissions || [],
      status: teacher.status === "Inactive" ? "Inactive" : "Active",
      model: "Teacher",
    }));

    const merged = [...staff.map((item) => ({ ...item, model: "Staff" })), ...teacherItems]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({
      success: true,
      data: merged,
    });
  } catch (error) {
    next(error);
  }
};

/* ---------------- GET SINGLE STAFF ---------------- */
export const getSingleStaff = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;

    const staff = await Staff
      .findOne({ _id: req.params.id, schoolId })
      .select("-password -temp_password");

    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff member not found" });
    }

    return res.json({ success: true, data: staff });
  } catch (error) {
    next(error);
  }
};

/* ---------------- UPDATE STAFF ---------------- */
export const updateStaff = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;

    const {
      fullName,
      email,
      phone,
      dob,
      gender,
      address,
      staffRole,
      staffRoleCustom,
      joiningDate,
      employmentType,
      salary,
      permissions,
      password,
      status,
    } = req.body;

    // ── 1. FIND STAFF ─────────────────────────────
    const staff = await Staff.findOne({ _id: req.params.id, schoolId });
    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff member not found" });
    }

    // ── 2. BUILD UPDATE OBJECT ────────────────────
    const updateData = {};

    if (fullName?.trim())  updateData.fullName  = fullName;
    if (email?.trim())     updateData.email     = email;
    if (phone)             updateData.phone     = phone;
    if (dob)               updateData.dob       = dob;
    if (gender)            updateData.gender    = gender;
    if (address)           updateData.address   = address;
    if (staffRole)         updateData.staffRole = staffRole;
    if (joiningDate)       updateData.joiningDate   = joiningDate;
    if (employmentType)    updateData.employmentType = employmentType;
    if (salary)            updateData.salary    = salary;
    if (status)            updateData.status    = status;

    if (staffRole === "other" && staffRoleCustom?.trim()) {
      updateData.staffRoleCustom = staffRoleCustom;
    }

    // ── 3. HANDLE PERMISSIONS ─────────────────────
    if (permissions) {
      let parsedPermissions = [];
      try {
        parsedPermissions = JSON.parse(permissions);
      } catch {
        return res.status(400).json({ success: false, message: "Invalid permissions format" });
      }

      // validate keys
      const invalidPerms = parsedPermissions.filter((p) => !MODULE_KEYS.includes(p));
      if (invalidPerms.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid permission(s): ${invalidPerms.join(", ")}`,
        });
      }

      // validate against school subscriptions
      const school = await School.findById(schoolId).select("subscribed_modules");
      const invalidForSchool = parsedPermissions.filter(
        (p) => !school.subscribed_modules.includes(p)
      );
      if (invalidForSchool.length > 0) {
        return res.status(400).json({
          success: false,
          message: `School has not subscribed to: ${invalidForSchool.join(", ")}`,
        });
      }

      updateData.permissions = parsedPermissions;
    }

    // ── 4. HANDLE PASSWORD ────────────────────────
    if (password?.trim()) {
      updateData.password      = await bcrypt.hash(password, 10);
      updateData.temp_password = password;
    }

    // ── 5. HANDLE PHOTO ───────────────────────────
    if (req.file) {
      const uploaded = await uploadToCloudinary(req.file, "staff");
      updateData.photo = {
        url:       uploaded.url,
        public_id: uploaded.public_id,
        type:      req.file.mimetype,
      };
    }

    // ── 6. UPDATE ─────────────────────────────────
    const updated = await Staff.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select("-password -temp_password");

    return res.json({
      success: true,
      message: "Staff member updated successfully",
      data: updated,
    });

  } catch (error) {
    next(error);
  }
};

/* ---------------- TOGGLE STATUS ---------------- */
export const toggleStaffStatus = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;

    const staff = await Staff.findOne({ _id: req.params.id, schoolId });
    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff member not found" });
    }

    staff.status = staff.status === "Active" ? "Inactive" : "Active";
    await staff.save();

    return res.json({
      success: true,
      message: `Staff member ${staff.status === "Active" ? "activated" : "deactivated"} successfully`,
      data: { status: staff.status },
    });
  } catch (error) {
    next(error);
  }
};

/* ---------------- TOGGLE ADMIN GROUP ---------------- */
export const toggleAdminGroupMembership = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const { model } = req.params;
    const { isAdminGroup } = req.body;

    const normalizedModel = String(model || "").toLowerCase();
    const TargetModel = normalizedModel === "teacher" ? Teacher : Staff;

    if (!["teacher", "staff"].includes(normalizedModel)) {
      return res.status(400).json({
        success: false,
        message: "Invalid member type",
      });
    }

    const member = await TargetModel.findOne({ _id: req.params.id, schoolId });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: `${normalizedModel === "teacher" ? "Teacher" : "Staff member"} not found`,
      });
    }

    member.isAdminGroup = Boolean(isAdminGroup);
    await member.save();

    return res.json({
      success: true,
      message: "Admin group membership updated successfully",
      data: { isAdminGroup: member.isAdminGroup },
    });
  } catch (error) {
    next(error);
  }
};

/* ---------------- DELETE STAFF ---------------- */
export const deleteStaff = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;

    const staff = await Staff.findOneAndDelete({ _id: req.params.id, schoolId });
    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff member not found" });
    }

    return res.json({
      success: true,
      message: "Staff member deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};