import LeaveType from "../models/leaveType.js";
import StaffLeavePolicy from "../models/staffLeavePolicy.js";
import StaffLeaveBalance from "../models/staffLeaveBalance.js";
import StaffLeaveRequest from "../models/staffLeaveRequest.js";
import Teacher from "../models/teacher.js";
import Staff from "../models/staff.js";
import { createNotificationHelper } from "./notificationController.js";
import {
  countLeaveDays,
  getPeriodKey,
  normalizeCreditFrequency,
  periodLabel,
  roundHalf,
} from "../utils/staffLeave.js";

const resolveActor = (user) => {
  if (user?.role === "teacher_admin" && user?.teacher_id) {
    return {
      personType: "teacher",
      personId: user.teacher_id,
      schoolId: user.school_id,
    };
  }
  if (user?.role === "staff_admin" && user?.staff_id) {
    return {
      personType: "staff",
      personId: user.staff_id,
      schoolId: user.school_id,
    };
  }
  return null;
};

const getPersonName = async (personType, personId, schoolId) => {
  if (personType === "teacher") {
    const t = await Teacher.findOne({ _id: personId, schoolId })
      .select("fullName")
      .lean();
    return t?.fullName || "Teacher";
  }
  const s = await Staff.findOne({ _id: personId, schoolId })
    .select("fullName")
    .lean();
  return s?.fullName || "Staff";
};

const listSchoolPeople = async (schoolId) => {
  const [teachers, staff] = await Promise.all([
    Teacher.find({ schoolId }).select("_id fullName").lean(),
    Staff.find({ schoolId }).select("_id fullName").lean(),
  ]);
  return [
    ...teachers.map((t) => ({
      personType: "teacher",
      personId: t._id,
      name: t.fullName,
    })),
    ...staff.map((s) => ({
      personType: "staff",
      personId: s._id,
      name: s.fullName,
    })),
  ];
};

/** Ensure balance rows exist and credit allotment for current period if missing. */
export const ensureCreditsForPerson = async ({
  schoolId,
  personType,
  personId,
  asOf = new Date(),
}) => {
  const policy = await StaffLeavePolicy.findOne({ schoolId }).lean();
  if (!policy || !policy.allotments?.length) {
    return { policy: null, periodKey: null, balances: [] };
  }

  const frequency = normalizeCreditFrequency(policy.creditFrequency);
  const periodKey = getPeriodKey(asOf, frequency);
  const balances = [];

  for (const allot of policy.allotments) {
    const days = Math.max(0, Number(allot.daysPerPeriod) || 0);
    let row = await StaffLeaveBalance.findOne({
      schoolId,
      personType,
      personId,
      leaveTypeId: allot.leaveTypeId,
      periodKey,
    });

    if (!row) {
      row = await StaffLeaveBalance.create({
        schoolId,
        personType,
        personId,
        leaveTypeId: allot.leaveTypeId,
        periodKey,
        credited: days,
        used: 0,
        balance: days,
      });
    }

    balances.push(row);
  }

  return { policy, periodKey, balances };
};

const creditAllForSchool = async (schoolId) => {
  const people = await listSchoolPeople(schoolId);
  let credited = 0;
  for (const p of people) {
    await ensureCreditsForPerson({
      schoolId,
      personType: p.personType,
      personId: p.personId,
    });
    credited += 1;
  }
  return credited;
};

const restoreBalance = async (request) => {
  if (!request.deducted) return;
  const row = await StaffLeaveBalance.findOne({
    schoolId: request.schoolId,
    personType: request.personType,
    personId: request.personId,
    leaveTypeId: request.leaveTypeId,
    periodKey: request.periodKey,
  });
  if (!row) return;
  row.used = Math.max(0, roundHalf(row.used - Number(request.days)));
  row.balance = roundHalf(row.credited - row.used);
  await row.save();
  request.deducted = false;
  await request.save();
};

const canManageLeaveTypes = (role) =>
  ["super_admin", "school_admin"].includes(role);

/** Leave types visible to a school: global + that school's own. */
const leaveTypesForSchoolFilter = (schoolId, activeOnly = false) => {
  const scope = schoolId
    ? {
        $or: [
          { schoolId: null },
          { schoolId: { $exists: false } },
          { schoolId },
        ],
      }
    : {};
  if (activeOnly) {
    return schoolId ? { ...scope, isActive: true } : { isActive: true };
  }
  return scope;
};

/* ═══════════════════════════════════════════════════
   SUPER ADMIN + SCHOOL ADMIN — Leave Types
═══════════════════════════════════════════════════ */
export const listLeaveTypes = async (req, res) => {
  try {
    const activeOnly = String(req.query.active || "") === "1";
    const role = req.user?.role;
    let filter = {};

    if (role === "super_admin") {
      // Platform catalog: global types (and optional school filter)
      if (req.query.schoolId) {
        filter = leaveTypesForSchoolFilter(req.query.schoolId, activeOnly);
      } else if (String(req.query.global || "") === "1") {
        filter = {
          $or: [{ schoolId: null }, { schoolId: { $exists: false } }],
        };
        if (activeOnly) filter.isActive = true;
      } else if (activeOnly) {
        filter = { isActive: true };
      }
    } else {
      const schoolId = req.user?.school_id;
      if (!schoolId) {
        return res
          .status(400)
          .json({ success: false, message: "School required" });
      }
      filter = leaveTypesForSchoolFilter(schoolId, activeOnly);
    }

    const types = await LeaveType.find(filter).sort({ sortOrder: 1, name: 1 });
    return res.json({ success: true, data: types });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to load leave types",
    });
  }
};

export const createLeaveType = async (req, res) => {
  try {
    const role = req.user?.role;
    if (!canManageLeaveTypes(role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    const name = String(req.body.name || "").trim();
    const code = String(req.body.code || "").trim().toUpperCase();
    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: "Name and code are required",
      });
    }

    let schoolId = null;
    if (role === "school_admin") {
      schoolId = req.user.school_id;
      if (!schoolId) {
        return res
          .status(400)
          .json({ success: false, message: "School required" });
      }
    } else if (req.body.schoolId) {
      schoolId = req.body.schoolId;
    }

    const exists = await LeaveType.findOne({
      code,
      schoolId: schoolId || null,
    });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: `Leave type code ${code} already exists`,
      });
    }
    const doc = await LeaveType.create({
      schoolId: schoolId || null,
      name,
      code,
      description: String(req.body.description || "").trim(),
      isPaid: req.body.isPaid !== false,
      isActive: req.body.isActive !== false,
      sortOrder: Number(req.body.sortOrder) || 0,
    });
    return res.status(201).json({ success: true, data: doc });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Leave type code already exists",
      });
    }
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to create leave type",
    });
  }
};

export const updateLeaveType = async (req, res) => {
  try {
    const role = req.user?.role;
    if (!canManageLeaveTypes(role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    const { id } = req.params;
    const existing = await LeaveType.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    if (role === "school_admin") {
      const schoolId = req.user.school_id;
      if (
        !existing.schoolId ||
        String(existing.schoolId) !== String(schoolId)
      ) {
        return res.status(403).json({
          success: false,
          message:
            "School admin can only edit leave types created for this school",
        });
      }
    }

    const updates = {};
    if (req.body.name != null) updates.name = String(req.body.name).trim();
    if (req.body.code != null)
      updates.code = String(req.body.code).trim().toUpperCase();
    if (req.body.description != null)
      updates.description = String(req.body.description).trim();
    if (req.body.isPaid != null) updates.isPaid = !!req.body.isPaid;
    if (req.body.isActive != null) updates.isActive = !!req.body.isActive;
    if (req.body.sortOrder != null)
      updates.sortOrder = Number(req.body.sortOrder) || 0;

    if (updates.code) {
      const clash = await LeaveType.findOne({
        code: updates.code,
        schoolId: existing.schoolId || null,
        _id: { $ne: id },
      });
      if (clash) {
        return res.status(400).json({
          success: false,
          message: `Leave type code ${updates.code} already exists`,
        });
      }
    }

    const doc = await LeaveType.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });
    return res.json({ success: true, data: doc });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to update leave type",
    });
  }
};

export const deleteLeaveType = async (req, res) => {
  try {
    const role = req.user?.role;
    if (!canManageLeaveTypes(role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    const existing = await LeaveType.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    if (role === "school_admin") {
      const schoolId = req.user.school_id;
      if (
        !existing.schoolId ||
        String(existing.schoolId) !== String(schoolId)
      ) {
        return res.status(403).json({
          success: false,
          message:
            "School admin can only deactivate leave types created for this school",
        });
      }
    }
    existing.isActive = false;
    await existing.save();
    return res.json({
      success: true,
      message: "Leave type deactivated",
      data: existing,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to delete leave type",
    });
  }
};

/* ═══════════════════════════════════════════════════
   SCHOOL ADMIN — Policy + balances + approvals
═══════════════════════════════════════════════════ */
export const getLeavePolicy = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    if (!schoolId) {
      return res.status(400).json({ success: false, message: "School required" });
    }
    let policy = await StaffLeavePolicy.findOne({ schoolId })
      .populate("allotments.leaveTypeId")
      .lean();
    const types = await LeaveType.find(
      leaveTypesForSchoolFilter(schoolId, true),
    ).sort({ sortOrder: 1, name: 1 });
    if (!policy) {
      policy = {
        schoolId,
        creditFrequency: "yearly",
        allotments: [],
        allowCarryForward: false,
        maxCarryForwardDays: 0,
      };
    }
    return res.json({
      success: true,
      data: {
        policy,
        leaveTypes: types,
        periodKey: getPeriodKey(
          new Date(),
          policy.creditFrequency || "yearly",
        ),
        periodLabel: periodLabel(
          getPeriodKey(new Date(), policy.creditFrequency || "yearly"),
        ),
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to load leave policy",
    });
  }
};

export const saveLeavePolicy = async (req, res) => {
  try {
    if (req.user?.role !== "school_admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    const schoolId = req.user.school_id;
    const creditFrequency = normalizeCreditFrequency(req.body.creditFrequency);
    const allotments = Array.isArray(req.body.allotments)
      ? req.body.allotments
          .map((a) => ({
            leaveTypeId: a.leaveTypeId,
            daysPerPeriod: Math.max(0, Number(a.daysPerPeriod) || 0),
          }))
          .filter((a) => a.leaveTypeId && a.daysPerPeriod >= 0)
      : [];

    const policy = await StaffLeavePolicy.findOneAndUpdate(
      { schoolId },
      {
        $set: {
          creditFrequency,
          allotments,
          allowCarryForward: !!req.body.allowCarryForward,
          maxCarryForwardDays: Math.max(
            0,
            Number(req.body.maxCarryForwardDays) || 0,
          ),
        },
      },
      { new: true, upsert: true, runValidators: true },
    ).populate("allotments.leaveTypeId");

    // Credit current period for everyone after policy save
    const peopleCount = await creditAllForSchool(schoolId);

    return res.json({
      success: true,
      message: `Leave policy saved. Credits applied for ${peopleCount} employees in current period.`,
      data: policy,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to save leave policy",
    });
  }
};

export const runLeaveCredits = async (req, res) => {
  try {
    if (req.user?.role !== "school_admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    const count = await creditAllForSchool(req.user.school_id);
    return res.json({
      success: true,
      message: `Leave credited for ${count} employees (current period only if not already credited).`,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to run leave credits",
    });
  }
};

export const listStaffLeaveBalances = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const policy = await StaffLeavePolicy.findOne({ schoolId }).lean();
    const frequency = normalizeCreditFrequency(policy?.creditFrequency);
    const periodKey =
      req.query.periodKey || getPeriodKey(new Date(), frequency);

    const people = await listSchoolPeople(schoolId);
    // Lazy-credit when admin opens balances
    await Promise.all(
      people.map((p) =>
        ensureCreditsForPerson({
          schoolId,
          personType: p.personType,
          personId: p.personId,
        }),
      ),
    );

    const balances = await StaffLeaveBalance.find({
      schoolId,
      periodKey,
    })
      .populate("leaveTypeId", "name code isPaid")
      .lean();

    const byPerson = {};
    for (const p of people) {
      const key = `${p.personType}:${p.personId}`;
      byPerson[key] = {
        personType: p.personType,
        personId: p.personId,
        name: p.name,
        balances: [],
      };
    }
    for (const b of balances) {
      const key = `${b.personType}:${b.personId}`;
      if (!byPerson[key]) continue;
      byPerson[key].balances.push({
        leaveTypeId: b.leaveTypeId?._id || b.leaveTypeId,
        leaveTypeName: b.leaveTypeId?.name || "",
        leaveTypeCode: b.leaveTypeId?.code || "",
        credited: b.credited,
        used: b.used,
        balance: b.balance,
      });
    }

    return res.json({
      success: true,
      data: {
        periodKey,
        periodLabel: periodLabel(periodKey),
        creditFrequency: frequency,
        people: Object.values(byPerson),
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to load balances",
    });
  }
};

export const listManageStaffLeaves = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const filter = { schoolId };
    if (req.query.status && req.query.status !== "all") {
      filter.status = req.query.status;
    }
    const rows = await StaffLeaveRequest.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to load leave requests",
    });
  }
};

export const actionStaffLeave = async (req, res) => {
  try {
    if (!["school_admin", "staff_admin"].includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    const { id } = req.params;
    const action = String(req.body.action || "").toLowerCase();
    if (!["approved", "rejected"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "action must be approved or rejected",
      });
    }

    const request = await StaffLeaveRequest.findOne({
      _id: id,
      schoolId: req.user.school_id,
    });
    if (!request) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending requests can be updated",
      });
    }

    if (action === "rejected") {
      await restoreBalance(request);
    }

    request.status = action;
    request.actionBy = req.user._id || req.user.id || null;
    request.actionByName = req.user.name || req.user.email || "";
    request.actionByRole = req.user.role;
    request.actionNote = String(req.body.note || "").trim() || null;
    request.actionAt = new Date();
    await request.save();

    try {
      await createNotificationHelper({
        title:
          action === "approved"
            ? "Staff leave approved"
            : "Staff leave rejected",
        message: `Your ${request.leaveTypeName || "leave"} request (${request.days} day(s)) was ${action}.`,
        notificationType: "general",
        schoolId: request.schoolId,
        targets: [
          request.personType === "teacher"
            ? { type: "teacher", teacherId: request.personId }
            : { type: "staff", staffId: request.personId },
        ],
        createdBy: req.user._id || req.user.id,
      });
    } catch {
      /* ignore notify errors */
    }

    return res.json({
      success: true,
      message: `Leave ${action}`,
      data: request,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to update leave",
    });
  }
};

/* ═══════════════════════════════════════════════════
   TEACHER / STAFF — apply + my balances / history
═══════════════════════════════════════════════════ */
export const getMyStaffLeave = async (req, res) => {
  try {
    const actor = resolveActor(req.user);
    if (!actor) {
      return res.status(403).json({
        success: false,
        message: "Only teachers and staff can view leave balances",
      });
    }

    const { policy, periodKey, balances } = await ensureCreditsForPerson(actor);
    const types = await LeaveType.find(
      leaveTypesForSchoolFilter(actor.schoolId, true),
    )
      .sort({ sortOrder: 1, name: 1 })
      .lean();
    const typeMap = Object.fromEntries(types.map((t) => [String(t._id), t]));

    const balanceRows = (balances || []).map((b) => {
      const t = typeMap[String(b.leaveTypeId)] || {};
      return {
        leaveTypeId: b.leaveTypeId,
        name: t.name || "",
        code: t.code || "",
        isPaid: t.isPaid !== false,
        credited: b.credited,
        used: b.used,
        balance: b.balance,
        periodKey: b.periodKey,
      };
    });

    const requests = await StaffLeaveRequest.find({
      schoolId: actor.schoolId,
      personType: actor.personType,
      personId: actor.personId,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.json({
      success: true,
      data: {
        creditFrequency: policy?.creditFrequency || null,
        periodKey,
        periodLabel: periodLabel(periodKey),
        balances: balanceRows,
        leaveTypes: types,
        requests,
        policyConfigured: Boolean(policy?.allotments?.length),
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to load leave account",
    });
  }
};

export const applyStaffLeave = async (req, res) => {
  try {
    const actor = resolveActor(req.user);
    if (!actor) {
      return res.status(403).json({
        success: false,
        message: "Only teachers and staff can apply for leave",
      });
    }

    const leaveTypeId = req.body.leaveTypeId;
    const reason = String(req.body.reason || "").trim();
    const fromDate = req.body.fromDate;
    const toDate = req.body.toDate;

    if (!leaveTypeId) {
      return res
        .status(400)
        .json({ success: false, message: "Leave type is required" });
    }
    if (!reason) {
      return res
        .status(400)
        .json({ success: false, message: "Reason is required" });
    }
    if (!fromDate || !toDate) {
      return res
        .status(400)
        .json({ success: false, message: "From and To dates are required" });
    }
    if (new Date(fromDate) > new Date(toDate)) {
      return res.status(400).json({
        success: false,
        message: "From date cannot be after To date",
      });
    }

    const leaveType = await LeaveType.findOne({
      _id: leaveTypeId,
      isActive: true,
      $or: [
        { schoolId: null },
        { schoolId: { $exists: false } },
        { schoolId: actor.schoolId },
      ],
    });
    if (!leaveType) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid leave type" });
    }

    const days =
      req.body.days != null && Number(req.body.days) > 0
        ? roundHalf(req.body.days)
        : countLeaveDays(fromDate, toDate);

    if (days <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid leave duration" });
    }

    const { policy, periodKey } = await ensureCreditsForPerson(actor);
    if (!policy?.allotments?.length) {
      return res.status(400).json({
        success: false,
        message:
          "Leave policy is not configured by school admin yet. Contact admin.",
      });
    }

    const allotted = policy.allotments.some(
      (a) => String(a.leaveTypeId) === String(leaveTypeId),
    );
    if (!allotted) {
      return res.status(400).json({
        success: false,
        message: "This leave type is not enabled for your school",
      });
    }

    const balance = await StaffLeaveBalance.findOne({
      schoolId: actor.schoolId,
      personType: actor.personType,
      personId: actor.personId,
      leaveTypeId,
      periodKey,
    });

    if (!balance || Number(balance.balance) < days) {
      return res.status(400).json({
        success: false,
        message: `Insufficient leave balance. Available: ${
          balance?.balance ?? 0
        } day(s)`,
      });
    }

    // Auto-cut on apply
    balance.used = roundHalf(balance.used + days);
    balance.balance = roundHalf(balance.credited - balance.used);
    await balance.save();

    const personName = await getPersonName(
      actor.personType,
      actor.personId,
      actor.schoolId,
    );

    const request = await StaffLeaveRequest.create({
      schoolId: actor.schoolId,
      personType: actor.personType,
      personId: actor.personId,
      personName,
      leaveTypeId: leaveType._id,
      leaveTypeName: leaveType.name,
      leaveTypeCode: leaveType.code,
      fromDate,
      toDate,
      days,
      reason,
      status: "pending",
      periodKey,
      deducted: true,
    });

    try {
      await createNotificationHelper({
        title: "Staff leave application",
        message: `${personName} applied for ${days} day(s) ${leaveType.name} leave.`,
        notificationType: "general",
        schoolId: actor.schoolId,
        targets: [{ type: "role", roles: ["school_admin"], schoolId: actor.schoolId }],
        createdBy: req.user._id || req.user.id,
      });
    } catch {
      /* ignore */
    }

    return res.status(201).json({
      success: true,
      message: `Leave applied. ${days} day(s) deducted from your ${leaveType.code} balance.`,
      data: {
        request,
        balance: {
          credited: balance.credited,
          used: balance.used,
          balance: balance.balance,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to apply leave",
    });
  }
};

export const cancelStaffLeave = async (req, res) => {
  try {
    const actor = resolveActor(req.user);
    if (!actor) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    const request = await StaffLeaveRequest.findOne({
      _id: req.params.id,
      schoolId: actor.schoolId,
      personType: actor.personType,
      personId: actor.personId,
    });
    if (!request) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending leave can be cancelled",
      });
    }
    await restoreBalance(request);
    request.status = "cancelled";
    request.actionAt = new Date();
    request.actionNote = "Cancelled by applicant";
    await request.save();
    return res.json({
      success: true,
      message: "Leave cancelled and balance restored",
      data: request,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to cancel leave",
    });
  }
};
