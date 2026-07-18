import Lead from "../models/lead.js";
import School from "../models/school.js";
import Staff from "../models/staff.js";
import Teacher from "../models/teacher.js";

const ALLOWED_LEAD_STATUSES = ["active", "processing", "admitted", "cancelled"];

const resolveActor = (user = {}) => ({
  userId: user._id || user.id || user.staff_id || user.teacher_id || user.school_id,
  name: user.name || user.email || "Unknown User",
  role: user.role || "",
});

const normalizeStaffRole = (staff) => {
  if (staff.staffRole === "other" && staff.staffRoleCustom) {
    return staff.staffRoleCustom;
  }

  if (!staff.staffRole) {
    return "Staff";
  }

  return staff.staffRole
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const buildAssignableUsers = async (schoolId) => {
  const [school, teachers, staffMembers] = await Promise.all([
    School.findById(schoolId)
      .select("school_name admin_name admin_email")
      .lean(),
    Teacher.find({
      schoolId,
      isAdminGroup: true,
      status: { $ne: "Inactive" },
    })
      .select("fullName email teacherId")
      .lean(),
    Staff.find({
      schoolId,
      isAdminGroup: true,
      status: "Active",
    })
      .select("fullName email staffId staffRole staffRoleCustom")
      .lean(),
  ]);

  const users = [];

  if (school) {
    users.push({
      userId: school._id,
      userType: "school_admin",
      name: school.admin_name || school.school_name || "School Admin",
      roleLabel: "School Admin",
      email: school.admin_email || "",
    });
  }

  teachers.forEach((teacher) => {
    users.push({
      userId: teacher._id,
      userType: "teacher",
      name: teacher.fullName,
      roleLabel: "Teacher",
      email: teacher.email || "",
      referenceId: teacher.teacherId || "",
    });
  });

  staffMembers.forEach((staff) => {
    users.push({
      userId: staff._id,
      userType: "staff",
      name: staff.fullName,
      roleLabel: normalizeStaffRole(staff),
      email: staff.email || "",
      referenceId: staff.staffId || "",
    });
  });

  return users;
};

export const getLeadAssignees = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;

    if (!schoolId) {
      return res.status(400).json({ success: false, message: "School ID is required" });
    }

    const users = await buildAssignableUsers(schoolId);

    return res.json({ success: true, data: users });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to load assignees" });
  }
};

export const getLeads = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;

    if (!schoolId) {
      return res.status(400).json({ success: false, message: "School ID is required" });
    }

    const query = { schoolId };

    // Staff should only see leads assigned to their own account.
    if (req.user?.role === "staff_admin" && req.user?.staff_id) {
      query["assignedTo.userType"] = "staff";
      query["assignedTo.userId"] = req.user.staff_id;
    }

    const leads = await Lead.find(query).sort({ createdAt: -1 }).lean();

    return res.json({ success: true, data: leads });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to load leads" });
  }
};

export const createLead = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;

    if (!schoolId) {
      return res.status(400).json({ success: false, message: "School ID is required" });
    }

    const {
      studentName,
      parentName,
      parentMobile,
      parentEmail,
      previousSchoolName,
      assignedToUserId,
      assignedToUserType,
    } = req.body;

    if (!studentName?.trim()) {
      return res.status(400).json({ success: false, message: "Student name is required" });
    }

    if (!parentName?.trim()) {
      return res.status(400).json({ success: false, message: "Parent name is required" });
    }

    if (!parentMobile?.trim()) {
      return res.status(400).json({ success: false, message: "Parent mobile number is required" });
    }

    if (!assignedToUserId || !assignedToUserType) {
      return res.status(400).json({ success: false, message: "Lead assignee is required" });
    }

    const assignableUsers = await buildAssignableUsers(schoolId);
    const assignee = assignableUsers.find(
      (user) => String(user.userId) === String(assignedToUserId) && user.userType === assignedToUserType,
    );

    if (!assignee) {
      return res.status(400).json({ success: false, message: "Selected assignee is not available" });
    }

    const lead = await Lead.create({
      studentName: studentName.trim(),
      parentName: parentName.trim(),
      parentMobile: parentMobile.trim(),
      parentEmail: parentEmail?.trim() || "",
      previousSchoolName: previousSchoolName?.trim() || "",
      assignedTo: {
        userId: assignee.userId,
        userType: assignee.userType,
        name: assignee.name,
        roleLabel: assignee.roleLabel,
      },
      schoolId,
      createdBy: req.user?._id || req.user?.id || req.user?.school_id,
    });

    return res.status(201).json({
      success: true,
      message: "Lead created successfully",
      data: lead,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to create lead" });
  }
};

export const deleteLead = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;

    if (!schoolId) {
      return res.status(400).json({ success: false, message: "School ID is required" });
    }

    const lead = await Lead.findOneAndDelete({ _id: req.params.id, schoolId });

    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    return res.json({ success: true, message: "Lead deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to delete lead" });
  }
};

export const updateLeadStatus = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;

    if (!schoolId) {
      return res.status(400).json({ success: false, message: "School ID is required" });
    }

    const nextStatus = String(req.body?.status || "").toLowerCase();
    if (!ALLOWED_LEAD_STATUSES.includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead status",
      });
    }

    const query = { _id: req.params.id, schoolId };

    if (req.user?.role === "staff_admin" && req.user?.staff_id) {
      query["assignedTo.userType"] = "staff";
      query["assignedTo.userId"] = req.user.staff_id;
    }

    const lead = await Lead.findOneAndUpdate(
      query,
      { $set: { status: nextStatus } },
      { new: true },
    );

    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    return res.json({
      success: true,
      message: "Lead status updated successfully",
      data: lead,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to update status" });
  }
};

export const updateLeadAssignee = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;

    if (!schoolId) {
      return res.status(400).json({ success: false, message: "School ID is required" });
    }

    const assignedToUserId = req.body?.assignedToUserId;
    const assignedToUserType = req.body?.assignedToUserType;

    if (!assignedToUserId || !assignedToUserType) {
      return res.status(400).json({ success: false, message: "Lead assignee is required" });
    }

    const assignableUsers = await buildAssignableUsers(schoolId);
    const assignee = assignableUsers.find(
      (user) => String(user.userId) === String(assignedToUserId) && user.userType === assignedToUserType,
    );

    if (!assignee) {
      return res.status(400).json({ success: false, message: "Selected assignee is not available" });
    }

    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, schoolId },
      {
        $set: {
          assignedTo: {
            userId: assignee.userId,
            userType: assignee.userType,
            name: assignee.name,
            roleLabel: assignee.roleLabel,
          },
        },
      },
      { new: true },
    );

    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    return res.json({
      success: true,
      message: "Lead assignee updated successfully",
      data: lead,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to update assignee" });
  }
};

export const addLeadFollowUp = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;

    if (!schoolId) {
      return res.status(400).json({ success: false, message: "School ID is required" });
    }

    const comment = String(req.body?.comment || "").trim();
    if (!comment) {
      return res.status(400).json({ success: false, message: "Feedback comment is required" });
    }

    const actor = resolveActor(req.user);
    if (!actor.userId) {
      return res.status(400).json({ success: false, message: "Invalid user context" });
    }

    const followUp = {
      comment,
      addedBy: actor,
      createdAt: new Date(),
    };

    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, schoolId },
      { $push: { followUps: followUp } },
      { new: true },
    );

    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    return res.json({
      success: true,
      message: "Feedback added successfully",
      data: lead,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to add feedback" });
  }
};

export const getLeadFollowUps = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;

    if (!schoolId) {
      return res.status(400).json({ success: false, message: "School ID is required" });
    }

    const lead = await Lead.findOne({ _id: req.params.id, schoolId })
      .select("studentName followUps")
      .lean();

    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    const followUps = [...(lead.followUps || [])].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );

    return res.json({
      success: true,
      data: {
        leadId: req.params.id,
        studentName: lead.studentName,
        followUps,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to load feedback" });
  }
};