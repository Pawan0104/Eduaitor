import fs from "fs";

const path = "D:/eduaitor/Backend/controllers/feeController.js";
let src = fs.readFileSync(path, "utf8");

const oldBlock = `let periodRemark = "";
    if (periodKeys.length) {
      const feeDetails = await buildStudentFeeResponse({
        studentId: sId,
        schoolId: schId,
      });
      const resolved = resolveSelectedInstallments(
        feeDetails?.installments,
        periodKeys,
      );
      if (!resolved.ok) {
        return res.status(400).json({
          success: false,
          message: resolved.message,
        });
      }
      amountPaid = resolved.amount;
      periodKeys = resolved.periodKeys;
      periodRemark = resolved.labels.join(", ");
    }`;

const newBlock = `let periodRemark = "";
    let feeHeads = Array.isArray(req.body.feeHeads)
      ? req.body.feeHeads
          .map((h) => ({
            feeId: h.feeId || h._id || undefined,
            name: String(h.name || "").trim(),
            amount: Number(h.amount) || 0,
          }))
          .filter((h) => h.name && h.amount > 0)
      : [];

    if (periodKeys.length) {
      const feeDetails = await buildStudentFeeResponse({
        studentId: sId,
        schoolId: schId,
      });
      const resolved = resolveSelectedInstallments(
        feeDetails?.installments,
        periodKeys,
      );
      if (!resolved.ok) {
        return res.status(400).json({
          success: false,
          message: resolved.message,
        });
      }
      amountPaid = resolved.amount;
      periodKeys = resolved.periodKeys;
      periodRemark = resolved.labels.join(", ");
    } else if (feeHeads.length) {
      amountPaid =
        Math.round(
          feeHeads.reduce((s, h) => s + Number(h.amount), 0) * 100,
        ) / 100;
      periodRemark = feeHeads.map((h) => h.name).join(", ");
    }

    const voucherId = req.body.voucherId || null;`;

if (!src.includes(oldBlock)) {
  console.error("collect block not found");
  process.exit(1);
}
src = src.replace(oldBlock, newBlock);

const oldCreate = `const newPayment = await Payment.create({
      studentId: sId,
      schoolId: schId,
      amountPaid: Number(amountPaid),
      paymentMode,
      remarks: finalRemarks,
      periodKeys,
      receiptNo: receiptId,
      paidDate: new Date(),
      utr: paymentMode === "UPI" ? utr : "",
      transactionId:
        paymentMode === "Online"
          ? transactionId || String(req.body.paymentId || "").trim()
          : "",
      razorpayOrderId: req.body.orderId || null,
      razorpayPaymentId: req.body.paymentId || null,
      razorpaySignature: req.body.signature || null,
    });`;

const newCreate = `const newPayment = await Payment.create({
      studentId: sId,
      schoolId: schId,
      amountPaid: Number(amountPaid),
      paymentMode,
      remarks: finalRemarks,
      periodKeys,
      feeHeads,
      entryType: "payment",
      status: "settled",
      voucherId: voucherId || null,
      receiptNo: receiptId,
      paidDate: new Date(),
      utr: paymentMode === "UPI" ? utr : "",
      transactionId:
        paymentMode === "Online"
          ? transactionId || String(req.body.paymentId || "").trim()
          : "",
      razorpayOrderId: req.body.orderId || null,
      razorpayPaymentId: req.body.paymentId || null,
      razorpaySignature: req.body.signature || null,
    });

    if (voucherId && mongoose.Types.ObjectId.isValid(voucherId)) {
      await Payment.findOneAndUpdate(
        { _id: voucherId, schoolId: schId, entryType: "voucher" },
        { $set: { status: "collected" } },
      );
    }`;

if (!src.includes(oldCreate)) {
  console.error("create block not found");
  process.exit(1);
}
src = src.replace(oldCreate, newCreate);

const oldReceipt = `receipt: {
        receiptNo: payment.receiptNo,
        amountPaid: payment.amountPaid,
        paymentMode: payment.paymentMode,
        paidDate: payment.paidDate,
        remarks: payment.remarks || "",
        utr: payment.utr || "",
        transactionId: payment.transactionId || "",
        razorpayOrderId: payment.razorpayOrderId || "",
        razorpayPaymentId: payment.razorpayPaymentId || "",
        paymentId: payment._id,
      },`;

const newReceipt = `receipt: {
        receiptNo: payment.receiptNo,
        amountPaid: payment.amountPaid,
        paymentMode: payment.paymentMode,
        paidDate: payment.paidDate,
        remarks: payment.remarks || "",
        utr: payment.utr || "",
        transactionId: payment.transactionId || "",
        razorpayOrderId: payment.razorpayOrderId || "",
        razorpayPaymentId: payment.razorpayPaymentId || "",
        paymentId: payment._id,
        entryType: payment.entryType || "payment",
        status: payment.status || "settled",
        feeHeads: payment.feeHeads || [],
        refundOf: payment.refundOf || null,
      },`;

if (!src.includes(oldReceipt)) {
  console.error("receipt block not found");
  process.exit(1);
}
src = src.replace(oldReceipt, newReceipt);

if (src.includes("export const getStudentFeeHeads")) {
  console.log("already patched append; skipping append");
} else {
  src += `

// ─────────────────────────────────────────────────────────────
// Fee heads + refund + voucher
// ─────────────────────────────────────────────────────────────

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const computeHeadBalances = (breakdown, payments = []) => {
  const paidMap = {};
  let unallocated = 0;

  for (const p of payments) {
    const type = p.entryType || "payment";
    if (type === "voucher") continue;
    const sign = type === "refund" ? -1 : 1;
    const heads = Array.isArray(p.feeHeads) ? p.feeHeads : [];
    if (heads.length) {
      for (const h of heads) {
        const key = String(h.feeId || h.name || "");
        if (!key) continue;
        paidMap[key] = round2(
          (paidMap[key] || 0) + sign * (Number(h.amount) || 0),
        );
      }
    } else {
      unallocated = round2(unallocated + sign * (Number(p.amountPaid) || 0));
    }
  }

  let leftover = Math.max(0, unallocated);
  return breakdown.map((fee) => {
    const key = String(fee._id || fee.name);
    let paid = Math.max(0, paidMap[key] || 0);
    const amount = round2(fee.amount);
    if (leftover > 0 && paid < amount) {
      const take = Math.min(leftover, amount - paid);
      paid = round2(paid + take);
      leftover = round2(leftover - take);
    }
    const due = Math.max(0, round2(amount - paid));
    return {
      _id: fee._id,
      name: fee.name,
      amount,
      isOptional: !!fee.isOptional,
      paid,
      due,
    };
  });
};

export const getStudentFeeHeads = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const { studentId } = req.params;
    if (!schoolId || !studentId) {
      return res
        .status(400)
        .json({ success: false, message: "studentId and schoolId required" });
    }

    const feeDetails = await buildStudentFeeResponse({ studentId, schoolId });
    if (!feeDetails) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    const payments = feeDetails.payments || [];
    const heads = computeHeadBalances(feeDetails.feeStructure || [], payments);
    const openVouchers = payments
      .filter((p) => p.entryType === "voucher" && p.status === "open")
      .map((p) => ({
        _id: p._id,
        receiptNo: p.receiptNo,
        amountPaid: p.amountPaid,
        feeHeads: p.feeHeads || [],
        paidDate: p.paidDate,
        remarks: p.remarks || "",
      }));

    return res.json({
      success: true,
      student: feeDetails.student,
      finalFee: feeDetails.finalFee,
      totalPaid: feeDetails.totalPaid,
      totalDue: feeDetails.totalDue,
      heads,
      openVouchers,
      recentPayments: payments
        .filter((p) => (p.entryType || "payment") === "payment")
        .slice(0, 20)
        .map((p) => ({
          _id: p._id,
          receiptNo: p.receiptNo,
          amountPaid: p.amountPaid,
          paymentMode: p.paymentMode,
          paidDate: p.paidDate,
          feeHeads: p.feeHeads || [],
        })),
    });
  } catch (error) {
    console.error("getStudentFeeHeads error:", error);
    return res
      .status(500)
      .json({ success: false, message: error.message || "Server error" });
  }
};

export const createFeeVoucher = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const { studentId, remarks } = req.body;
    let feeHeads = Array.isArray(req.body.feeHeads) ? req.body.feeHeads : [];

    if (!schoolId || !studentId) {
      return res
        .status(400)
        .json({ success: false, message: "studentId required" });
    }

    const sId = new mongoose.Types.ObjectId(studentId);
    const schId = new mongoose.Types.ObjectId(schoolId);
    const student = await Student.findOne({ _id: sId, schoolId: schId });
    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    const feeDetails = await buildStudentFeeResponse({
      studentId: sId,
      schoolId: schId,
    });
    const balances = computeHeadBalances(
      feeDetails?.feeStructure || [],
      feeDetails?.payments || [],
    );
    const byId = Object.fromEntries(balances.map((h) => [String(h._id), h]));

    feeHeads = feeHeads
      .map((h) => {
        const bal =
          byId[String(h.feeId || h._id)] ||
          balances.find((b) => b.name === h.name);
        if (!bal || bal.due <= 0) return null;
        const amount = Math.min(Number(h.amount) || bal.due, bal.due);
        if (amount <= 0) return null;
        return { feeId: bal._id, name: bal.name, amount: round2(amount) };
      })
      .filter(Boolean);

    if (!feeHeads.length) {
      return res.status(400).json({
        success: false,
        message: "Select at least one due fee head",
      });
    }

    const amount = round2(feeHeads.reduce((s, h) => s + h.amount, 0));
    const counter = await Counter.findOneAndUpdate(
      { _id: \`receiptNo_\${schoolId}\` },
      { $inc: { seq: 1 }, $setOnInsert: { schoolId: schId } },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
    );
    const receiptId = \`VCH-\${counter.seq}\`;

    const voucher = await Payment.create({
      studentId: sId,
      schoolId: schId,
      amountPaid: amount,
      paymentMode: "Voucher",
      remarks:
        remarks ||
        \`Fee voucher — \${feeHeads.map((h) => h.name).join(", ")}\`,
      feeHeads,
      entryType: "voucher",
      status: "open",
      receiptNo: receiptId,
      paidDate: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: "Voucher created",
      data: voucher,
    });
  } catch (error) {
    console.error("createFeeVoucher error:", error);
    return res
      .status(500)
      .json({ success: false, message: error.message || "Server error" });
  }
};

export const refundStudentFee = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const { studentId, paymentId, remarks, reason } = req.body;
    let feeHeads = Array.isArray(req.body.feeHeads) ? req.body.feeHeads : [];
    let amount = Number(req.body.amount);

    if (!schoolId || !studentId) {
      return res
        .status(400)
        .json({ success: false, message: "studentId required" });
    }

    const sId = new mongoose.Types.ObjectId(studentId);
    const schId = new mongoose.Types.ObjectId(schoolId);
    const student = await Student.findOne({ _id: sId, schoolId: schId });
    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    let original = null;
    if (paymentId) {
      original = await Payment.findOne({
        _id: paymentId,
        studentId: sId,
        schoolId: schId,
      });
      if (
        !original ||
        (original.entryType && original.entryType !== "payment")
      ) {
        return res
          .status(404)
          .json({ success: false, message: "Original payment not found" });
      }
      if (
        !feeHeads.length &&
        Array.isArray(original.feeHeads) &&
        original.feeHeads.length
      ) {
        feeHeads = original.feeHeads.map((h) => ({
          feeId: h.feeId,
          name: h.name,
          amount: Number(h.amount) || 0,
        }));
      }
      if (!amount || amount <= 0) {
        amount = Number(original.amountPaid) || 0;
      }
      if (amount > Number(original.amountPaid)) {
        return res.status(400).json({
          success: false,
          message: "Refund cannot exceed original payment amount",
        });
      }
    }

    feeHeads = feeHeads
      .map((h) => ({
        feeId: h.feeId || h._id || undefined,
        name: String(h.name || "").trim(),
        amount: Number(h.amount) || 0,
      }))
      .filter((h) => h.name && h.amount > 0);

    if (feeHeads.length) {
      amount = round2(feeHeads.reduce((s, h) => s + h.amount, 0));
    }

    if (!amount || amount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Enter a valid refund amount" });
    }

    const maxRefundable = Number(student.totalPaid) || 0;
    if (amount > maxRefundable) {
      return res.status(400).json({
        success: false,
        message: \`Refund cannot exceed total paid (₹\${maxRefundable})\`,
      });
    }

    const counter = await Counter.findOneAndUpdate(
      { _id: \`receiptNo_\${schoolId}\` },
      { $inc: { seq: 1 }, $setOnInsert: { schoolId: schId } },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
    );
    const receiptId = \`REF-\${counter.seq}\`;

    const refund = await Payment.create({
      studentId: sId,
      schoolId: schId,
      amountPaid: amount,
      paymentMode: "Refund",
      remarks:
        remarks ||
        reason ||
        (feeHeads.length
          ? \`Fee refund — \${feeHeads.map((h) => h.name).join(", ")}\`
          : "Fee refund"),
      feeHeads,
      entryType: "refund",
      status: "settled",
      refundOf: original?._id || null,
      receiptNo: receiptId,
      paidDate: new Date(),
    });

    student.totalPaid = round2((Number(student.totalPaid) || 0) - amount);
    student.totalDue = round2(
      (Number(student.finalFee) || 0) - student.totalPaid,
    );
    await student.save();

    await createNotificationHelper({
      title: \`Fee Refund: ₹\${amount}\`,
      message: \`Refund of ₹\${amount} processed for \${student.firstName} \${student.lastName}. Remaining Due: ₹\${student.totalDue}\`,
      notificationType: "fee",
      targets: [{ type: "student", studentId: student._id }],
      schoolId,
      createdBy: req.user._id,
    });

    return res.status(200).json({
      success: true,
      message: "Refund processed",
      data: {
        refund,
        updatedBalances: {
          totalPaid: student.totalPaid,
          totalDue: student.totalDue,
        },
      },
    });
  } catch (error) {
    console.error("refundStudentFee error:", error);
    return res
      .status(500)
      .json({ success: false, message: error.message || "Server error" });
  }
};
`;
}

fs.writeFileSync(path, src);
console.log("feeController patched OK");
