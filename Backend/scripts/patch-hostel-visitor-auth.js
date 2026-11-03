import fs from "fs";

const ctrlPath = "D:/eduaitor/Backend/controllers/hostelVisitorController.js";
let src = fs.readFileSync(ctrlPath, "utf8");

if (!src.includes('import Student from "../models/student.js"')) {
  src = src.replace(
    'import HostelVisitor from "../models/hostelVisitor.js";',
    'import HostelVisitor from "../models/hostelVisitor.js";\nimport Student from "../models/student.js";',
  );
}

const helpers = `
const normPhone = (p) => String(p || "").replace(/\\D/g, "");
const normName = (n) =>
  String(n || "")
    .trim()
    .toLowerCase()
    .replace(/\\s+/g, " ");

/** Match visitor against student's registered father/mother/guardian */
const matchRegisteredGuardian = (student, visitorName, phone) => {
  if (!student) return { matched: false, relation: "" };
  const contacts = [
    { role: "Father", name: student.fatherName, phone: student.fatherMobile },
    { role: "Mother", name: student.motherName, phone: student.motherMobile },
    {
      role: "Guardian",
      name: student.guardianName,
      phone: student.guardianMobile,
    },
  ];
  const vp = normPhone(phone);
  const vn = normName(visitorName);
  for (const c of contacts) {
    const cn = normName(c.name);
    const cp = normPhone(c.phone);
    if (!cn && !cp) continue;
    const phoneMatch =
      cp &&
      vp &&
      (cp === vp ||
        cp.slice(-10) === vp.slice(-10) ||
        vp.endsWith(cp.slice(-10)) ||
        cp.endsWith(vp.slice(-10)));
    const nameMatch =
      cn && vn && (cn === vn || cn.includes(vn) || vn.includes(cn));
    if (phoneMatch || (nameMatch && (!vp || !cp || phoneMatch || nameMatch))) {
      if (phoneMatch || nameMatch) {
        return { matched: true, relation: c.role };
      }
    }
  }
  return { matched: false, relation: "" };
};
`;

if (!src.includes("matchRegisteredGuardian")) {
  src = src.replace(
    "const uploadVisitorPhoto = async (req) => {",
    `${helpers}\nconst uploadVisitorPhoto = async (req) => {`,
  );
}

// Replace createVisitor body after resident resolution through return
const createStart = "/* ---------------- CREATE (guard submits for approval) ---------------- */";
const createEnd = "/* ---------------- APPROVE (warden — grants entry) ---------------- */";
const createIdx = src.indexOf(createStart);
const approveIdx = src.indexOf(createEnd);
if (createIdx < 0 || approveIdx < 0) {
  console.error("create/approve markers not found");
  process.exit(1);
}

const newCreate = `/* ---------------- CREATE (guard submits for approval) ---------------- */
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
      visitorRelation: relationRaw,
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
    let studentDoc = null;

    if (residentId) {
      const resident = await HostelResident.findOne({
        _id: residentId,
        schoolId,
        status: "Active",
      }).populate(
        "studentId",
        "firstName lastName studentId fatherName fatherMobile motherName motherMobile guardianName guardianMobile",
      );

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
      studentDoc = resident.studentId || null;
      if (!resolvedWhom && resident.studentId) {
        resolvedWhom =
          \`\${resident.studentId.firstName || ""} \${resident.studentId.lastName || ""}\`.trim();
      }
    }

    if (!studentDoc && studentId) {
      studentDoc = await Student.findById(studentId)
        .select(
          "firstName lastName studentId fatherName fatherMobile motherName motherMobile guardianName guardianMobile",
        )
        .lean();
    }

    const declaredRelation =
      String(relationRaw || "").toLowerCase() === "parent"
        ? "Parent"
        : "Other";

    const match = matchRegisteredGuardian(
      studentDoc,
      visitorName,
      phone,
    );

    const isParentVisit =
      declaredRelation === "Parent" || match.matched === true;

    // Unknown / new visitor must be linked to a resident so parent can authorize
    if (!isParentVisit && !studentId) {
      return res.status(400).json({
        success: false,
        message:
          "Select the hostel resident being visited. New visitors need parent authorization first.",
      });
    }

    const status = isParentVisit ? "Pending" : "PendingParentAuth";
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
      visitorRelation: isParentVisit ? "Parent" : "Other",
      isRegisteredContact: !!match.matched,
      matchedRelation: match.relation || (isParentVisit ? "Parent" : ""),
      residentId: residentId || null,
      studentId,
      photo,
      status,
      checkInAt: null,
      submittedBy,
      notes: String(notes || "").trim(),
    });

    try {
      if (status === "PendingParentAuth" && studentId) {
        await createNotificationHelper({
          title: "Authorize hostel visitor",
          message: \`\${visitor.visitorName} wants to visit your child at \${hostel.name}. Please authorize or reject this visitor.\`,
          notificationType: "general",
          schoolId,
          createdBy: submittedBy.userId,
          targets: [{ type: "student", studentId }],
        });
      } else {
        await createNotificationHelper({
          title: "Hostel visitor approval needed",
          message: \`\${visitor.visitorName} (parent/guardian) is waiting at the gate for \${hostel.name}. Review and approve or reject entry.\`,
          notificationType: "general",
          schoolId,
          createdBy: submittedBy.userId,
          targets: [
            { type: "role", roles: ["school_admin"] },
            { type: "role", roles: ["staff_admin"] },
          ],
        });
      }
    } catch (notifyErr) {
      console.error("Visitor approval notify failed:", notifyErr.message);
    }

    const data = await populateVisitor(HostelVisitor.findById(visitor._id)).lean();

    return res.status(201).json({
      success: true,
      message:
        status === "PendingParentAuth"
          ? "Visitor request sent to parent for authorization."
          : "Visitor request submitted for warden approval.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

`;

src = src.slice(0, createIdx) + newCreate + src.slice(approveIdx);

// Patch createParentVisitorRequest to mark as Parent → Pending
src = src.replace(
  `const visitor = await HostelVisitor.create({
      schoolId,
      hostelId: resident.hostelId,
      visitorName: String(visitorName).trim(),
      phone: String(phone || "").trim(),
      purpose: String(purpose || "").trim(),
      whomVisiting: resolvedWhom,
      residentId: resident._id,
      studentId,
      photo: { url: "", public_id: "", type: "" },
      status: "Pending",
      checkInAt: null,
      submittedBy,
      notes,
    });`,
  `const visitor = await HostelVisitor.create({
      schoolId,
      hostelId: resident.hostelId,
      visitorName: String(visitorName).trim(),
      phone: String(phone || "").trim(),
      purpose: String(purpose || "").trim(),
      whomVisiting: resolvedWhom,
      visitorRelation: "Parent",
      isRegisteredContact: true,
      matchedRelation: "Parent",
      residentId: resident._id,
      studentId,
      photo: { url: "", public_id: "", type: "" },
      status: "Pending",
      checkInAt: null,
      submittedBy,
      notes,
    });`,
);

// Patch approveVisitor status check
src = src.replace(
  `if (visitor.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending visitor requests can be approved.",
      });
    }

    const reviewer = resolveActor(req.user);
    visitor.status = "CheckedIn";`,
  `if (visitor.status === "PendingParentAuth") {
      return res.status(400).json({
        success: false,
        message:
          "This visitor is waiting for parent authorization. Warden can approve only after the parent authorizes.",
      });
    }
    if (visitor.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending visitor requests can be approved.",
      });
    }

    const reviewer = resolveActor(req.user);
    visitor.status = "CheckedIn";`,
);

// Patch rejectVisitor to allow PendingParentAuth too
src = src.replace(
  `if (visitor.status !== "Pending") {
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
    await visitor.save();`,
  `if (!["Pending", "PendingParentAuth"].includes(visitor.status)) {
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
    visitor.rejectedByRole = "warden";
    visitor.approvedByName = "";
    await visitor.save();`,
);

if (!src.includes("export const getParentPendingVisitorAuth")) {
  src += `

/* ---------------- PARENT: list pending authorizations ---------------- */
export const getParentPendingVisitorAuth = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const studentId = req.user?.student_id;
    const isParent =
      req.user?.role === "student_admin" &&
      (req.user?.loginAs === "parent" || !req.user?.loginAs);

    if (!isParent) {
      return res.status(403).json({
        success: false,
        message: "Only parents can view visitor authorizations.",
      });
    }
    if (!schoolId || !studentId) {
      return res.status(400).json({
        success: false,
        message: "Student not linked to this account.",
      });
    }

    const visitors = await populateVisitor(
      HostelVisitor.find({
        schoolId,
        studentId,
        status: "PendingParentAuth",
      }).sort({ createdAt: -1 }),
    ).lean();

    return res.json({ success: true, data: visitors });
  } catch (error) {
    next(error);
  }
};

/* ---------------- PARENT: authorize → send to warden ---------------- */
export const parentAuthorizeVisitor = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const studentId = req.user?.student_id;
    const { id } = req.params;
    const isParent =
      req.user?.role === "student_admin" &&
      (req.user?.loginAs === "parent" || !req.user?.loginAs);

    if (!isParent) {
      return res.status(403).json({
        success: false,
        message: "Only parents can authorize visitors.",
      });
    }

    const visitor = await HostelVisitor.findOne({
      _id: id,
      schoolId,
      studentId,
      status: "PendingParentAuth",
    });
    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: "Pending visitor authorization not found.",
      });
    }

    const actor = resolveActor(req.user);
    visitor.status = "Pending";
    visitor.parentAuthBy = actor;
    visitor.parentAuthAt = new Date();
    visitor.parentAuthNote = String(req.body?.note || "").trim();
    await visitor.save();

    try {
      const hostel = await Hostel.findById(visitor.hostelId).select("name");
      await createNotificationHelper({
        title: "Parent authorized hostel visitor",
        message: \`\${visitor.visitorName} was authorized by parent for \${hostel?.name || "hostel"}. Awaiting warden approval.\`,
        notificationType: "general",
        schoolId,
        createdBy: actor.userId,
        targets: [
          { type: "role", roles: ["school_admin"] },
          { type: "role", roles: ["staff_admin"] },
        ],
      });
    } catch (notifyErr) {
      console.error("Parent authorize notify failed:", notifyErr.message);
    }

    const data = await populateVisitor(HostelVisitor.findById(visitor._id)).lean();
    return res.json({
      success: true,
      message: "Visitor authorized. Sent to warden for approval.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

/* ---------------- PARENT: reject → straight reject ---------------- */
export const parentRejectVisitor = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const studentId = req.user?.student_id;
    const { id } = req.params;
    const reason = String(
      req.body?.reason || req.body?.rejectionReason || "Parent did not authorize",
    ).trim();
    const isParent =
      req.user?.role === "student_admin" &&
      (req.user?.loginAs === "parent" || !req.user?.loginAs);

    if (!isParent) {
      return res.status(403).json({
        success: false,
        message: "Only parents can reject visitor authorization.",
      });
    }

    const visitor = await HostelVisitor.findOne({
      _id: id,
      schoolId,
      studentId,
      status: "PendingParentAuth",
    });
    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: "Pending visitor authorization not found.",
      });
    }

    const actor = resolveActor(req.user);
    visitor.status = "Rejected";
    visitor.parentAuthBy = actor;
    visitor.parentAuthAt = new Date();
    visitor.reviewedBy = actor;
    visitor.reviewedAt = new Date();
    visitor.rejectionReason = reason;
    visitor.rejectedByRole = "parent";
    visitor.approvedByName = "";
    await visitor.save();

    const data = await populateVisitor(HostelVisitor.findById(visitor._id)).lean();
    return res.json({
      success: true,
      message: "Visitor authorization rejected.",
      data,
    });
  } catch (error) {
    next(error);
  }
};
`;
}

fs.writeFileSync(ctrlPath, src);
console.log("hostelVisitorController patched");
