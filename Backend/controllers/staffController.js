import Staff from "../models/staff.js";
import Teacher from "../models/teacher.js";
import SchoolStaffRole from "../models/schoolStaffRole.js";
import Group from "../models/group.js";
import { Driver } from "../models/transport.js";
import bcrypt from "bcryptjs";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";
import { deleteFromCloudinary } from "../utils/deleteFromCloudinary.js";
import { MODULE_KEYS } from "../constants/module.js";
import {
  getSchoolWithModules,
  resolveSubscribedModules,
  ensureDefaultSchoolModules,
} from "../utils/schoolModules.js";
import {
  getTeacherDeleteBlocker,
  getDriverDeleteBlocker,
  getStaffDeleteBlocker,
} from "../utils/staffDeleteGuards.js";

/** Resolve permissions from custom role or client payload; enforce school modules. */
const resolveStaffPermissions = async ({
  schoolId,
  customRoleId,
  permissionsRaw,
  requireRole = false,
  reqUser = {},
}) => {
  let school = await getSchoolWithModules(schoolId);
  const ctx = { userEmail: reqUser.email, role: reqUser.role };
  school = await ensureDefaultSchoolModules(school, ctx);
  const schoolModules = resolveSubscribedModules(school, ctx);

  if (customRoleId) {
    const role = await SchoolStaffRole.findOne({
      _id: customRoleId,
      schoolId,
    });
    if (!role) {
      return { error: "Custom role not found" };
    }
    if (!role.isActive) {
      return { error: "Selected role is inactive" };
    }
    const permissions = (role.permissions || []).filter((p) =>
      schoolModules.includes(p),
    );
    if (permissions.length === 0) {
      return {
        error:
          "Selected role has no modules available for your school. Update the role first.",
      };
    }
    return { permissions, customRoleId: role._id, role };
  }

  if (requireRole) {
    return { error: "Custom role is required for new staff" };
  }

  let parsedPermissions = [];
  if (permissionsRaw) {
    try {
      parsedPermissions =
        typeof permissionsRaw === "string"
          ? JSON.parse(permissionsRaw)
          : permissionsRaw;
    } catch {
      return { error: "Invalid permissions format" };
    }
  }

  const invalidPerms = parsedPermissions.filter((p) => !MODULE_KEYS.includes(p));
  if (invalidPerms.length > 0) {
    return { error: `Invalid permission(s): ${invalidPerms.join(", ")}` };
  }

  const invalidForSchool = parsedPermissions.filter(
    (p) => !schoolModules.includes(p),
  );
  if (invalidForSchool.length > 0) {
    return {
      error: `School has not subscribed to: ${invalidForSchool.join(", ")}`,
    };
  }

  return { permissions: parsedPermissions, customRoleId: null, role: null };
};

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
      customRoleId,
      joiningDate,
      employmentType,
      salary,
      permissions,  // JSON string from FormData (ignored when customRoleId set)
      password,
      status,
    } = req.body;

    // ── 1. GET SCHOOL ID FROM AUTH ────────────────
    // works for both school_admin and administrator staff
    const schoolId = req.user.school_id;

    // ── 2. VALIDATE REQUIRED ──────────────────────
    if (!fullName?.trim())  return res.status(400).json({ success: false, message: "Full name is required" });
    if (!email?.trim())     return res.status(400).json({ success: false, message: "Email is required" });
    if (!staffRole)         return res.status(400).json({ success: false, message: "Job title is required" });
    if (!password?.trim())  return res.status(400).json({ success: false, message: "Password is required" });
    if (staffRole === "other" && !staffRoleCustom?.trim()) {
      return res.status(400).json({ success: false, message: "Please specify the custom job title" });
    }
    if (!customRoleId) {
      return res.status(400).json({ success: false, message: "Custom role is required" });
    }

    // ── 3. CHECK EMAIL UNIQUE IN SCHOOL ───────────
    const exists = await Staff.findOne({ schoolId, email });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "A staff member with this email already exists in your school",
      });
    }

    // ── 4–5. RESOLVE PERMISSIONS FROM CUSTOM ROLE ─
    const resolved = await resolveStaffPermissions({
      schoolId,
      customRoleId,
      permissionsRaw: permissions,
      requireRole: true,
      reqUser: req.user,
    });
    if (resolved.error) {
      return res.status(400).json({ success: false, message: resolved.error });
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
      customRoleId:   resolved.customRoleId,
      joiningDate:    joiningDate || null,
      employmentType: employmentType || "Full-Time",
      salary:         salary     || null,
      permissions:    resolved.permissions,
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

    const [staff, teachers, drivers] = await Promise.all([
      Staff.find({ schoolId })
        .select("-password -temp_password")
        .populate("customRoleId", "name permissions isActive")
        .sort({ createdAt: -1 })
        .lean(),
      Teacher.find({ schoolId })
        .select("-password -temp_password")
        .populate("customRoleId", "name permissions isActive")
        .sort({ createdAt: -1 })
        .lean(),
      Driver.find({ schoolId })
        .populate("bus", "busId regNo")
        .populate("route", "name")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const teacherItems = teachers.map((teacher) => ({
      ...teacher,
      staffRole: "teacher",
      staffRoleCustom: null,
      customRoleName: teacher.customRoleId?.name || null,
      customRoleId:
        teacher.customRoleId?._id || teacher.customRoleId || null,
      staffId: teacher.teacherId,
      permissions: teacher.permissions || [],
      status: teacher.status === "Inactive" ? "Inactive" : "Active",
      model: "Teacher",
      personType: "Teaching",
    }));

    const staffItems = staff.map((item) => ({
      ...item,
      customRoleName: item.customRoleId?.name || null,
      customRoleId: item.customRoleId?._id || item.customRoleId || null,
      model: "Staff",
      personType: "Non-Teaching",
    }));

    const driverItems = drivers.map((driver) => ({
      ...driver,
      fullName: driver.name,
      email: "",
      staffRole: "driver",
      staffRoleCustom: null,
      customRoleName: null,
      customRoleId: null,
      staffId: driver.driverId,
      permissions: [],
      photo: driver.photo?.url
        ? {
            url: driver.photo.url,
            public_id: driver.photo.publicId || driver.photo.public_id,
            type: driver.photo.type,
          }
        : null,
      status: driver.status === "Inactive" ? "Inactive" : "Active",
      employmentType: null,
      joiningDate: null,
      isAdminGroup: false,
      model: "Driver",
      personType: "Transport",
      busLabel: driver.bus?.busId || null,
      routeLabel: driver.route?.name || null,
    }));

    const merged = [...staffItems, ...teacherItems, ...driverItems].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );

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
      .select("-password -temp_password")
      .populate("customRoleId", "name permissions isActive");

    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff member not found" });
    }

    const data = staff.toObject();
    data.customRoleName = data.customRoleId?.name || null;
    data.customRoleId = data.customRoleId?._id || data.customRoleId || null;

    return res.json({ success: true, data });
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
      customRoleId,
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

    // ── 3. HANDLE CUSTOM ROLE / PERMISSIONS ───────
    const roleChanging = customRoleId !== undefined && customRoleId !== "";
    const roleClearing = customRoleId === "" || customRoleId === "null";

    if (roleChanging && !roleClearing) {
      const resolved = await resolveStaffPermissions({
        schoolId,
        customRoleId,
        permissionsRaw: permissions,
        requireRole: false,
        reqUser: req.user,
      });
      if (resolved.error) {
        return res.status(400).json({ success: false, message: resolved.error });
      }
      updateData.customRoleId = resolved.customRoleId;
      updateData.permissions = resolved.permissions;
    } else if (roleClearing) {
      updateData.customRoleId = null;
      if (permissions) {
        const resolved = await resolveStaffPermissions({
          schoolId,
          customRoleId: null,
          permissionsRaw: permissions,
          reqUser: req.user,
        });
        if (resolved.error) {
          return res.status(400).json({ success: false, message: resolved.error });
        }
        updateData.permissions = resolved.permissions;
      }
    } else if (staff.customRoleId) {
      // Keep role-driven permissions in sync (ignore client permission overrides)
      const resolved = await resolveStaffPermissions({
        schoolId,
        customRoleId: staff.customRoleId,
        reqUser: req.user,
      });
      if (!resolved.error) {
        updateData.permissions = resolved.permissions;
      }
    } else if (permissions) {
      const resolved = await resolveStaffPermissions({
        schoolId,
        customRoleId: null,
        permissionsRaw: permissions,
        reqUser: req.user,
      });
      if (resolved.error) {
        return res.status(400).json({ success: false, message: resolved.error });
      }
      updateData.permissions = resolved.permissions;
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
    )
      .select("-password -temp_password")
      .populate("customRoleId", "name permissions isActive");

    const data = updated.toObject();
    data.customRoleName = data.customRoleId?.name || null;
    data.customRoleId = data.customRoleId?._id || data.customRoleId || null;

    return res.json({
      success: true,
      message: "Staff member updated successfully",
      data,
    });

  } catch (error) {
    next(error);
  }
};

/* ---------------- TOGGLE STATUS ---------------- */
export const toggleStaffStatus = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const id = req.params.id;

    let member = await Staff.findOne({ _id: id, schoolId });
    let kind = "Staff";
    if (!member) {
      member = await Teacher.findOne({ _id: id, schoolId });
      kind = "Teacher";
    }
    if (!member) {
      member = await Driver.findOne({ _id: id, schoolId });
      kind = "Driver";
    }
    if (!member) {
      return res.status(404).json({ success: false, message: "Staff member not found" });
    }

    if (kind === "Driver") {
      member.status = member.status === "Active" ? "Inactive" : "Active";
    } else if (kind === "Teacher") {
      member.status = member.status === "Inactive" ? "Active" : "Inactive";
    } else {
      member.status = member.status === "Active" ? "Inactive" : "Active";
    }
    await member.save();

    const activeLabel =
      member.status === "Active" || member.status === "Present"
        ? "activated"
        : "deactivated";

    return res.json({
      success: true,
      message: `${kind} ${activeLabel} successfully`,
      data: {
        status: member.status === "Inactive" ? "Inactive" : "Active",
      },
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
    const id = req.params.id;

    const staff = await Staff.findOne({ _id: id, schoolId });
    if (staff) {
      const blocker = await getStaffDeleteBlocker(staff._id, schoolId);
      if (blocker) {
        return res.status(409).json({ success: false, message: blocker });
      }
      if (staff.photo?.public_id) {
        try {
          await deleteFromCloudinary(staff.photo.public_id);
        } catch {
          /* non-blocking */
        }
      }
      await staff.deleteOne();
      return res.json({
        success: true,
        message: "Staff member deleted successfully",
      });
    }

    const teacher = await Teacher.findOne({ _id: id, schoolId });
    if (teacher) {
      const blocker = await getTeacherDeleteBlocker(teacher._id, schoolId);
      if (blocker) {
        return res.status(409).json({ success: false, message: blocker });
      }
      if (teacher.photo?.public_id) {
        try {
          await deleteFromCloudinary(teacher.photo.public_id);
        } catch {
          /* non-blocking */
        }
      }
      await Group.updateMany(
        { schoolId, "members.userId": teacher._id },
        { $pull: { members: { userId: teacher._id } } },
      );
      await teacher.deleteOne();
      return res.json({
        success: true,
        message: "Teacher deleted successfully",
      });
    }

    const driver = await Driver.findOne({ _id: id, schoolId });
    if (driver) {
      const blocker = await getDriverDeleteBlocker(driver);
      if (blocker) {
        return res.status(409).json({ success: false, message: blocker });
      }
      await driver.deleteOne();
      return res.json({
        success: true,
        message: "Driver deleted successfully",
      });
    }

    return res.status(404).json({
      success: false,
      message: "Staff member not found",
    });
  } catch (error) {
    next(error);
  }
};