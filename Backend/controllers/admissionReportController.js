import mongoose from "mongoose";
import Lead from "../models/lead.js";
import Registration from "../models/registration.js";
import School from "../models/school.js";

const ADMIN_ROLES = new Set(["school_admin", "staff_admin", "super_admin"]);

const schoolIdOf = (req) => req.user?.school_id;

const assertAdmin = (req) => {
  if (!schoolIdOf(req)) {
    const error = new Error("School not identified.");
    error.statusCode = 403;
    throw error;
  }
  if (!ADMIN_ROLES.has(req.user?.role)) {
    const error = new Error("Access denied");
    error.statusCode = 403;
    throw error;
  }
};

const parseDate = (value, endOfDay = false) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date;
};

const buildDateFilter = (from, to) => {
  const start = parseDate(from, false);
  const end = parseDate(to, true);
  if (!start && !end) return null;
  const filter = {};
  if (start) filter.$gte = start;
  if (end) filter.$lte = end;
  return filter;
};

const REPORT_TYPES = new Set([
  "enquiry",
  "status_summary",
  "class_summary",
  "registration",
]);

/**
 * GET /api/admission-reports?type=&from=&to=&classId=&status=&academicYear=
 *
 * type:
 *  - enquiry          Admission Enquiry Report (leads detail)
 *  - status_summary   Admission Status Summary (funnel + status counts)
 *  - class_summary    Admission Class-wise Summary
 *  - registration     Registration Report (detail rows)
 */
export const getAdmissionReport = async (req, res) => {
  try {
    assertAdmin(req);
    const schoolId = schoolIdOf(req);
    const type = String(req.query.type || "status_summary").trim();
    if (!REPORT_TYPES.has(type)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid report type. Use enquiry, status_summary, class_summary, or registration.",
      });
    }

    const from = String(req.query.from || "").trim();
    const to = String(req.query.to || "").trim();
    const classId = String(req.query.classId || "").trim();
    const status = String(req.query.status || "").trim();
    const academicYear = String(req.query.academicYear || "").trim();
    const dateFilter = buildDateFilter(from, to);

    const school = await School.findById(schoolId)
      .select("school_name school_logo address contact_phone contact_email")
      .lean();

    const meta = {
      type,
      generatedAt: new Date().toISOString(),
      filters: {
        from: from || null,
        to: to || null,
        classId: classId || null,
        status: status || null,
        academicYear: academicYear || null,
      },
      schoolId: String(schoolId),
      school: {
        _id: String(schoolId),
        name: school?.school_name || "",
        logo: school?.school_logo || "",
        address: school?.address || "",
        phone: school?.contact_phone || "",
        email: school?.contact_email || "",
      },
    };

    if (type === "enquiry") {
      const query = { schoolId };
      if (dateFilter) query.createdAt = dateFilter;
      if (status) query.status = status;

      const leads = await Lead.find(query)
        .sort({ createdAt: -1 })
        .lean();

      const rows = leads.map((lead, index) => ({
        sNo: index + 1,
        leadNumber: lead.leadNumber || "—",
        enquiryDate: lead.createdAt,
        studentName: lead.studentName || "",
        parentName: lead.parentName || "",
        parentMobile: lead.parentMobile || "",
        parentEmail: lead.parentEmail || "",
        previousSchoolName: lead.previousSchoolName || "",
        classId: lead.classId || null,
        className: lead.className || "",
        stream: lead.stream || "",
        assignedTo: lead.assignedTo?.name || "",
        assignedRole: lead.assignedTo?.roleLabel || "",
        status: lead.status || "active",
        followUps: Array.isArray(lead.followUps) ? lead.followUps.length : 0,
        lastFollowUpAt:
          Array.isArray(lead.followUps) && lead.followUps.length
            ? lead.followUps[lead.followUps.length - 1]?.createdAt || null
            : null,
        registrationId: lead.registrationId || null,
        studentId: lead.studentId || null,
        converted: Boolean(lead.studentId || lead.status === "admitted"),
      }));

      const byStatus = rows.reduce((acc, row) => {
        const key = row.status || "active";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      return res.json({
        success: true,
        data: {
          meta: {
            ...meta,
            title: "Admission Enquiry Report",
            description:
              "Detailed list of admission enquiries / leads captured by the school.",
          },
          summary: {
            totalEnquiries: rows.length,
            byStatus,
            converted: rows.filter((r) => r.converted).length,
            withRegistration: rows.filter((r) => r.registrationId).length,
          },
          rows,
        },
      });
    }

    if (type === "status_summary") {
      const leadQuery = { schoolId };
      const regQuery = { schoolId };
      if (dateFilter) {
        leadQuery.createdAt = dateFilter;
        regQuery.createdAt = dateFilter;
      }
      if (academicYear) regQuery.academicYear = academicYear;
      if (classId && mongoose.Types.ObjectId.isValid(classId)) {
        regQuery.classId = classId;
      }

      const [leadAgg, regAgg, leadsTotal, regsTotal] = await Promise.all([
        Lead.aggregate([
          { $match: leadQuery },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        Registration.aggregate([
          { $match: regQuery },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        Lead.countDocuments(leadQuery),
        Registration.countDocuments(regQuery),
      ]);

      const leadByStatus = Object.fromEntries(
        leadAgg.map((row) => [row._id || "unknown", row.count]),
      );
      const registrationByStatus = Object.fromEntries(
        regAgg.map((row) => [row._id || "unknown", row.count]),
      );

      const funnel = [
        {
          stage: "Enquiries (Leads)",
          count: leadsTotal,
          hint: "All admission enquiries in the selected period",
        },
        {
          stage: "Registered",
          count: regsTotal,
          hint: "Leads / applicants moved into Registration",
        },
        {
          stage: "Exam Scheduled",
          count: registrationByStatus.exam_scheduled || 0,
          hint: "Candidates linked to an entrance exam",
        },
        {
          stage: "Passed",
          count: registrationByStatus.passed || 0,
          hint: "Entrance exam passed",
        },
        {
          stage: "Admitted",
          count:
            (registrationByStatus.admitted || 0) +
            (leadByStatus.admitted || 0),
          hint: "Converted to student admission",
        },
      ];

      return res.json({
        success: true,
        data: {
          meta: {
            ...meta,
            title: "Admission Status Summary",
            description:
              "High-level admission funnel with lead and registration status totals.",
          },
          summary: {
            totalLeads: leadsTotal,
            totalRegistrations: regsTotal,
            leadByStatus,
            registrationByStatus,
          },
          funnel,
          tables: {
            leadStatus: Object.entries(leadByStatus).map(([status, count]) => ({
              status,
              count,
              share:
                leadsTotal > 0
                  ? Number(((count / leadsTotal) * 100).toFixed(1))
                  : 0,
            })),
            registrationStatus: Object.entries(registrationByStatus).map(
              ([status, count]) => ({
                status,
                count,
                share:
                  regsTotal > 0
                    ? Number(((count / regsTotal) * 100).toFixed(1))
                    : 0,
              }),
            ),
          },
        },
      });
    }

    if (type === "class_summary") {
      const match = { schoolId };
      if (dateFilter) match.createdAt = dateFilter;
      if (academicYear) match.academicYear = academicYear;
      if (classId && mongoose.Types.ObjectId.isValid(classId)) {
        match.classId = new mongoose.Types.ObjectId(classId);
      }
      if (status) match.status = status;

      const rows = await Registration.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              classId: "$classId",
              className: "$className",
            },
            total: { $sum: 1 },
            registered: {
              $sum: { $cond: [{ $eq: ["$status", "registered"] }, 1, 0] },
            },
            exam_scheduled: {
              $sum: { $cond: [{ $eq: ["$status", "exam_scheduled"] }, 1, 0] },
            },
            passed: {
              $sum: { $cond: [{ $eq: ["$status", "passed"] }, 1, 0] },
            },
            failed: {
              $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] },
            },
            admitted: {
              $sum: { $cond: [{ $eq: ["$status", "admitted"] }, 1, 0] },
            },
            cancelled: {
              $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
            },
            fromLead: {
              $sum: { $cond: [{ $eq: ["$source", "lead"] }, 1, 0] },
            },
            fromPublic: {
              $sum: { $cond: [{ $eq: ["$source", "public"] }, 1, 0] },
            },
            fromErp: {
              $sum: { $cond: [{ $eq: ["$source", "erp"] }, 1, 0] },
            },
          },
        },
        {
          $project: {
            _id: 0,
            classId: "$_id.classId",
            className: {
              $ifNull: ["$_id.className", "Unassigned"],
            },
            total: 1,
            registered: 1,
            exam_scheduled: 1,
            passed: 1,
            failed: 1,
            admitted: 1,
            cancelled: 1,
            fromLead: 1,
            fromPublic: 1,
            fromErp: 1,
            conversionRate: {
              $cond: [
                { $gt: ["$total", 0] },
                {
                  $round: [
                    { $multiply: [{ $divide: ["$admitted", "$total"] }, 100] },
                    1,
                  ],
                },
                0,
              ],
            },
          },
        },
        { $sort: { className: 1 } },
      ]);

      const totals = rows.reduce(
        (acc, row) => {
          acc.total += row.total;
          acc.admitted += row.admitted;
          acc.passed += row.passed;
          acc.failed += row.failed;
          acc.exam_scheduled += row.exam_scheduled;
          acc.registered += row.registered;
          acc.cancelled += row.cancelled;
          return acc;
        },
        {
          total: 0,
          admitted: 0,
          passed: 0,
          failed: 0,
          exam_scheduled: 0,
          registered: 0,
          cancelled: 0,
        },
      );

      return res.json({
        success: true,
        data: {
          meta: {
            ...meta,
            title: "Admission Class-wise Summary",
            description:
              "Registration and admission counts broken down by applied class.",
          },
          summary: {
            classes: rows.length,
            ...totals,
            overallConversion:
              totals.total > 0
                ? Number(((totals.admitted / totals.total) * 100).toFixed(1))
                : 0,
          },
          rows,
        },
      });
    }

    // registration detail report
    const query = { schoolId };
    if (dateFilter) query.createdAt = dateFilter;
    if (academicYear) query.academicYear = academicYear;
    if (classId && mongoose.Types.ObjectId.isValid(classId)) {
      query.classId = classId;
    }
    if (status) query.status = status;

    const registrations = await Registration.find(query)
      .sort({ createdAt: -1 })
      .lean();

    const rows = registrations.map((reg, index) => ({
      sNo: index + 1,
      registrationNumber: reg.registrationNumber || "—",
      registrationDate: reg.createdAt,
      academicYear: reg.academicYear || "",
      studentName: reg.studentName || "",
      gender: reg.gender || "",
      dob: reg.dob || null,
      className: reg.className || "",
      sectionName: reg.sectionName || "",
      parentName: reg.parentName || "",
      parentMobile: reg.parentMobile || "",
      parentEmail: reg.parentEmail || "",
      city: reg.city || "",
      previousSchoolName: reg.previousSchoolName || "",
      source: reg.source || "erp",
      status: reg.status || "registered",
      entranceExam: reg.entrance?.examName || "",
      entranceDate: reg.entrance?.examDate || null,
      entranceResult: reg.entrance?.result || "",
      obtainedMarks:
        reg.entrance?.obtainedMarks === null ||
        reg.entrance?.obtainedMarks === undefined
          ? ""
          : reg.entrance.obtainedMarks,
      totalMarks: reg.entrance?.totalMarks || "",
      admittedAt: reg.admittedAt || null,
      leadLinked: Boolean(reg.leadId),
    }));

    const byStatus = rows.reduce((acc, row) => {
      const key = row.status || "registered";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return res.json({
      success: true,
      data: {
        meta: {
          ...meta,
          title: "Registration Report",
          description:
            "Detailed registration records including entrance exam outcome and admission status.",
        },
        summary: {
          totalRegistrations: rows.length,
          byStatus,
          admitted: byStatus.admitted || 0,
          passed: byStatus.passed || 0,
          failed: byStatus.failed || 0,
        },
        rows,
      },
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Could not generate admission report.",
    });
  }
};
