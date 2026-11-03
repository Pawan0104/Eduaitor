import mongoose from "mongoose";
import FeeStructure from "../models/feeStructure.js";
import Class from "../models/class.js";
import Student from "../models/student.js";
import Payment from "../models/payment.js";
import Counter from "../models/receiptCounter.js";
import School from "../models/school.js";
import HostelResident from "../models/hostelResident.js";
import { createNotificationHelper } from "./notificationController.js";
import Razorpay from "razorpay";
import {
  allocateHeadsFifo,
  buildInstallments,
  normalizeFeeFrequency,
  resolveSelectedInstallments,
} from "../utils/feeInstallments.js";

/** Real Razorpay keys from dashboard. Missing/mock keys → development checkout. */
const hasRealRazorpayKeys = (school) => {
  const keyId = String(school?.razorpayKeyId || "").trim();
  const secret = String(school?.razorpayKeySecret || "").trim();
  if (!keyId || !secret) return false;
  if (keyId === "rzp_test_local" || keyId.startsWith("rzp_test_eduaitor")) {
    return false;
  }
  return /^rzp_(test|live)_[A-Za-z0-9]+$/.test(keyId);
};

//  Get fee structure for a class
export const getFeeStructures = async (req, res) => {
  try {
    const { classId } = req.params;
    const schoolId = req.user?.school_id;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: "School ID is required",
      });
    }

    const feeStructure = await FeeStructure.findOne({
      class: classId,
      schoolId,
    }).lean();

    if (!feeStructure) {
      return res.json({
        success: true,
        fees: [],
        frequency: "annually",
      });
    }

    return res.json({
      success: true,
      fees: feeStructure.fees || [],
      frequency: normalizeFeeFrequency(feeStructure.frequency),
      _id: feeStructure._id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/** PUT /:classId/frequency — school sets billing frequency for the class */
export const updateFeeFrequency = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const { classId } = req.params;
    const frequency = normalizeFeeFrequency(req.body?.frequency);

    if (!schoolId || !classId) {
      return res.status(400).json({
        success: false,
        message: "School ID and class ID are required",
      });
    }

    const doc = await FeeStructure.findOneAndUpdate(
      { class: classId, schoolId },
      {
        $set: { frequency },
        $setOnInsert: { fees: [], schoolId, class: classId },
      },
      { new: true, upsert: true, runValidators: true },
    );

    // Reflect on students in this class so parent accounts pick it up
    await Student.updateMany(
      { schoolId, classId },
      { $set: { feeFrequency: frequency } },
    );

    return res.json({
      success: true,
      message: `Fee frequency set to ${frequency}`,
      frequency: normalizeFeeFrequency(doc.frequency),
      fees: doc.fees || [],
    });
  } catch (err) {
    console.error("updateFeeFrequency error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};

const normalizeFeeCategory = (raw) => {
  const v = String(raw || "General").trim();
  return ["General", "Hostel", "Transport", "Other"].includes(v)
    ? v
    : "General";
};

const normalizeAppliesTo = (raw) => {
  const v = String(raw || "All").trim();
  return ["All", "New", "Old"].includes(v) ? v : "All";
};

const normalizeFeeBatch = (raw) => {
  const v = String(raw || "New").trim();
  return v === "Old" ? "Old" : "New";
};

export const addFeeComponent = async (req, res) => {
  try {
    const { name, amount, isOptional, category, appliesTo } = req.body;
    const schoolId = req.user?.school_id;

    if (!name || amount === undefined || !schoolId)
      return res
        .status(400)
        .json({ message: "Name, amount, and schoolId are required" });

    // Use BOTH class and schoolId to find or create the structure
    const doc = await FeeStructure.findOneAndUpdate(
      { class: req.params.classId, schoolId: schoolId },
      {
        $push: {
          fees: {
            name: String(name).trim(),
            amount: Number(amount),
            isOptional: !!isOptional,
            category: normalizeFeeCategory(category),
            appliesTo: normalizeAppliesTo(appliesTo),
          },
        },
      },
      { new: true, upsert: true, runValidators: true },
    );

    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

//  edit a existing one  fee component
export const editFeeComponent = async (req, res) => {
  try {
    const { name, amount, isOptional, category, appliesTo } = req.body;
    const schoolId = req.user?.school_id;
    const { classId, feeId } = req.params;

    if (!schoolId) {
      return res
        .status(400)
        .json({ message: "schoolId is required for security" });
    }

    const doc = await FeeStructure.findOneAndUpdate(
      {
        class: classId,
        schoolId: schoolId, // 👈 Ensures the user owns this structure
        "fees._id": feeId,
      },
      {
        $set: {
          "fees.$.name": name,
          "fees.$.amount": amount,
          "fees.$.isOptional": !!isOptional,
          "fees.$.category": normalizeFeeCategory(category),
          "fees.$.appliesTo": normalizeAppliesTo(appliesTo),
        },
      },
      { new: true, runValidators: true },
    );

    if (!doc)
      return res
        .status(404)
        .json({ message: "Fee component not found or unauthorized" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

//  Remove a fee component
export const deleteFeeComponent = async (req, res) => {
  try {
    const { classId, feeId } = req.params;
    const schoolId = req.user?.school_id;

    if (!schoolId) {
      return res
        .status(400)
        .json({ message: "School ID is required for deletion" });
    }

    const doc = await FeeStructure.findOneAndUpdate(
      {
        class: classId,
        schoolId: schoolId, // 🔒 Security check: User must own this record
      },
      { $pull: { fees: { _id: feeId } } },
      { new: true },
    );

    if (!doc)
      return res
        .status(404)
        .json({ message: "Fee structure not found or unauthorized" });

    res.json({ message: "Component deleted successfully", data: doc });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// collect fee function
export const initiateRazorpayOrder = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const studentId =
      req.user?.loginAs === "parent" || req.user?.loginAs === "student"
        ? req.user.student_id
        : req.body.studentId;
    let amount = Number(req.body.amount);
    const periodKeys = Array.isArray(req.body.periodKeys)
      ? req.body.periodKeys
      : [];
    let feeHeads = Array.isArray(req.body.feeHeads) ? req.body.feeHeads : [];

    if (!studentId || !schoolId) {
      return res.status(400).json({
        success: false,
        message: "Student ID and School ID are required",
      });
    }

    const school = await School.findById(schoolId).lean();
    if (!school) {
      return res.status(400).json({
        success: false,
        message: "School not found",
      });
    }

    const student = await Student.findOne({ _id: studentId, schoolId }).lean();
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    let resolvedKeys = [];
    let resolvedFeeHeads = [];
    const requestedAmount =
      req.body.amount !== undefined && req.body.amount !== null
        ? Number(req.body.amount)
        : NaN;

    if (periodKeys.length) {
      const feeDetails = await buildStudentFeeResponse({ studentId, schoolId });
      const resolved = resolveSelectedInstallments(
        feeDetails?.installments,
        periodKeys,
        Number.isFinite(requestedAmount) ? requestedAmount : undefined,
      );
      if (!resolved.ok) {
        return res.status(400).json({
          success: false,
          message: resolved.message,
        });
      }
      amount = resolved.amount;
      resolvedKeys = resolved.periodKeys;
    } else if (feeHeads.length) {
      const feeDetails = await buildStudentFeeResponse({ studentId, schoolId });
      const headRows = feeDetails?.heads || [];
      const byId = Object.fromEntries(
        headRows.map((h) => [String(h._id), h]),
      );
      const capped = feeHeads
        .map((h) => {
          const row =
            byId[String(h.feeId || h._id)] ||
            headRows.find((x) => x.name === h.name);
          if (!row || Number(row.due) <= 0) return null;
          const amt = Math.min(Number(h.amount) || row.due, row.due);
          if (amt <= 0) return null;
          return { feeId: row._id, name: row.name, amount: amt };
        })
        .filter(Boolean);
      if (!capped.length) {
        return res.status(400).json({
          success: false,
          message: "Select at least one due fee component",
        });
      }
      const headsMax =
        Math.round(capped.reduce((s, h) => s + Number(h.amount), 0) * 100) /
        100;
      const payAmt =
        Number.isFinite(requestedAmount) && requestedAmount > 0
          ? Math.min(requestedAmount, headsMax)
          : headsMax;
      resolvedFeeHeads = allocateHeadsFifo(capped, payAmt);
      amount =
        Math.round(
          resolvedFeeHeads.reduce((s, h) => s + Number(h.amount), 0) * 100,
        ) / 100;
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid amount is required",
      });
    }

    // Development: no real Razorpay keys yet → mock checkout order
    if (!hasRealRazorpayKeys(school)) {
      const orderId = `order_local_${Date.now()}`;
      return res.status(200).json({
        success: true,
        message: "Development payment gateway order created",
        mock: true,
        orderId,
        amount: Math.round(amount * 100),
        currency: "INR",
        key_id: "rzp_test_dev",
        studentId,
        amountRupees: amount,
        periodKeys: resolvedKeys,
        feeHeads: resolvedFeeHeads,
      });
    }

    const razorpay = new Razorpay({
      key_id: school.razorpayKeyId,
      key_secret: school.razorpayKeySecret,
    });

    const options = {
      amount: Math.round(amount * 100), // paise
      currency: "INR",
      receipt: `receipt_${studentId}_${Date.now()}`.slice(0, 40),
      payment_capture: 1,
      notes: {
        studentId: String(studentId),
        schoolId: String(schoolId),
        periodKeys: resolvedKeys.join(","),
        feeHeads: JSON.stringify(resolvedFeeHeads).slice(0, 480),
      },
    };

    const order = await razorpay.orders.create(options);

    return res.status(200).json({
      success: true,
      message: "Razorpay order initiated successfully",
      mock: false,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: school.razorpayKeyId,
      studentId,
      amountRupees: amount,
      periodKeys: resolvedKeys,
      feeHeads: resolvedFeeHeads,
    });
  } catch (error) {
    console.error("Razorpay Order Initiation Error:", error);
    return res.status(500).json({
      success: false,
      message:
        error?.error?.description ||
        error?.message ||
        "Server error during Razorpay order initiation",
      error: error.message,
    });
  }
};

export const verifyRazorpayPayment = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const studentId =
      req.user?.loginAs === "parent" || req.user?.loginAs === "student"
        ? req.user.student_id
        : req.body.studentId;
    const { orderId, paymentId, signature, amountPaid } = req.body;
    const periodKeys = Array.isArray(req.body.periodKeys)
      ? req.body.periodKeys
      : [];
    let feeHeads = Array.isArray(req.body.feeHeads) ? req.body.feeHeads : [];

    if (
      !orderId ||
      !paymentId ||
      !signature ||
      !studentId ||
      amountPaid === undefined ||
      !schoolId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Order ID, Payment ID, Signature, Student ID, Amount Paid, and School ID are required",
      });
    }

    const school = await School.findById(schoolId).lean();
    if (!school) {
      return res.status(400).json({
        success: false,
        message: "School not found",
      });
    }

    const isDevOrder = String(orderId).startsWith("order_local_");

    if (isDevOrder) {
      if (signature !== "local_test_signature") {
        return res.status(400).json({
          success: false,
          message: "Payment verification failed. Signature mismatch.",
        });
      }
    } else {
      if (!hasRealRazorpayKeys(school)) {
        return res.status(400).json({
          success: false,
          message: "Razorpay API keys not configured for this school.",
        });
      }

      const { validatePaymentVerification } = await import(
        "razorpay/dist/utils/razorpay-utils.js"
      );

      const isAuthentic = validatePaymentVerification(
        { order_id: orderId, payment_id: paymentId },
        signature,
        school.razorpayKeySecret,
      );

      if (!isAuthentic) {
        return res.status(400).json({
          success: false,
          message: "Payment verification failed. Signature mismatch.",
        });
      }
    }

    let payAmount = Number(amountPaid);
    let resolvedKeys = periodKeys;
    let periodLabel = "";
    let resolvedFeeHeads = feeHeads;

    if (periodKeys.length) {
      const feeDetails = await buildStudentFeeResponse({ studentId, schoolId });
      const resolved = resolveSelectedInstallments(
        feeDetails?.installments,
        periodKeys,
        payAmount,
      );
      if (!resolved.ok) {
        return res.status(400).json({
          success: false,
          message: resolved.message,
        });
      }
      payAmount = resolved.amount;
      resolvedKeys = resolved.periodKeys;
      periodLabel = resolved.labels.join(", ");
      if (resolved.partial) {
        periodLabel = `${periodLabel} (partial)`;
      }
    } else if (feeHeads.length) {
      const feeDetails = await buildStudentFeeResponse({ studentId, schoolId });
      const headRows = feeDetails?.heads || [];
      const byId = Object.fromEntries(
        headRows.map((h) => [String(h._id), h]),
      );
      const capped = feeHeads
        .map((h) => {
          const row =
            byId[String(h.feeId || h._id)] ||
            headRows.find((x) => x.name === h.name);
          if (!row || Number(row.due) <= 0) return null;
          const amt = Math.min(Number(h.amount) || row.due, row.due);
          if (amt <= 0) return null;
          return { feeId: row._id, name: row.name, amount: amt };
        })
        .filter(Boolean);
      const headsMax =
        Math.round(capped.reduce((s, h) => s + Number(h.amount), 0) * 100) /
        100;
      const amt =
        payAmount > 0 ? Math.min(payAmount, headsMax) : headsMax;
      resolvedFeeHeads = allocateHeadsFifo(capped, amt);
      payAmount =
        Math.round(
          resolvedFeeHeads.reduce((s, h) => s + Number(h.amount), 0) * 100,
        ) / 100;
      periodLabel = resolvedFeeHeads.map((h) => h.name).join(", ");
    }

    req.body.studentId = studentId;
    req.body.paymentMode = "Online";
    req.body.periodKeys = resolvedKeys;
    req.body.feeHeads = resolvedFeeHeads;
    req.body.remarks = isDevOrder
      ? `Dev Gateway Payment${periodLabel ? ` — ${periodLabel}` : ""} - Order ID: ${orderId}, Payment ID: ${paymentId}`
      : `Razorpay Payment${periodLabel ? ` — ${periodLabel}` : ""} - Order ID: ${orderId}, Payment ID: ${paymentId}`;
    req.body.amountPaid = payAmount;
    req.body.orderId = orderId;
    req.body.paymentId = paymentId;
    req.body.signature = signature;

    return collectStudentFeeInternal(req, res);
  } catch (error) {
    console.error("Razorpay Payment Verification Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during Razorpay payment verification",
      error: error.message,
    });
  }
};

// Renamed collectStudentFee to collectStudentFeeInternal for internal use
const collectStudentFeeInternal = async (req, res) => {
  try {
    const { studentId, paymentMode, remarks } = req.body;
    let amountPaid = Number(req.body.amountPaid);
    const schoolId = req.user?.school_id;
    const utr = String(req.body.utr || "").trim();
    const transactionId = String(
      req.body.transactionId || req.body.paymentId || "",
    ).trim();
    let periodKeys = Array.isArray(req.body.periodKeys)
      ? req.body.periodKeys.map(String).filter(Boolean)
      : [];

    if (!studentId || amountPaid === undefined || !paymentMode || !schoolId) {
      return res.status(400).json({
        message:
          "studentId, amountPaid, paymentMode, and schoolId are required",
      });
    }

    if (paymentMode === "UPI" && !utr) {
      return res.status(400).json({
        success: false,
        message: "UTR number is required for UPI payments",
      });
    }

    if (
      paymentMode === "Online" &&
      !transactionId &&
      !req.body.orderId &&
      !req.body.paymentId
    ) {
      return res.status(400).json({
        success: false,
        message: "Transaction ID is required for Online payments",
      });
    }

    const sId = new mongoose.Types.ObjectId(studentId);
    const schId = new mongoose.Types.ObjectId(schoolId);

    const student = await Student.findOne({ _id: sId, schoolId: schId });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    let periodRemark = "";
    let feeHeads = Array.isArray(req.body.feeHeads)
      ? req.body.feeHeads
          .map((h) => ({
            feeId: h.feeId || h._id || undefined,
            name: String(h.name || "").trim(),
            amount: Number(h.amount) || 0,
          }))
          .filter((h) => h.name && h.amount > 0)
      : [];

    const studentDue = Math.max(
      0,
      Math.round(
        ((Number(student.finalFee) || 0) - (Number(student.totalPaid) || 0)) *
          100,
      ) / 100,
    );

    if (periodKeys.length) {
      const feeDetails = await buildStudentFeeResponse({
        studentId: sId,
        schoolId: schId,
      });
      const resolved = resolveSelectedInstallments(
        feeDetails?.installments,
        periodKeys,
        amountPaid,
      );
      if (!resolved.ok) {
        return res.status(400).json({
          success: false,
          message: resolved.message,
        });
      }
      amountPaid = resolved.amount;
      periodKeys = resolved.periodKeys;
      periodRemark = resolved.partial
        ? `${resolved.labels.join(", ")} (partial)`
        : resolved.labels.join(", ");
    } else if (feeHeads.length) {
      const headsMax =
        Math.round(feeHeads.reduce((s, h) => s + Number(h.amount), 0) * 100) /
        100;
      const payAmt =
        amountPaid > 0 ? Math.min(amountPaid, headsMax, studentDue || headsMax) : headsMax;
      if (payAmt <= 0) {
        return res.status(400).json({
          success: false,
          message: "Enter a valid payment amount",
        });
      }
      if (amountPaid > headsMax + 0.009) {
        return res.status(400).json({
          success: false,
          message: `Amount cannot exceed selected heads total ₹${headsMax}`,
        });
      }
      feeHeads = allocateHeadsFifo(feeHeads, payAmt);
      amountPaid =
        Math.round(feeHeads.reduce((s, h) => s + Number(h.amount), 0) * 100) /
        100;
      periodRemark =
        amountPaid < headsMax - 0.009
          ? `${feeHeads.map((h) => h.name).join(", ")} (partial)`
          : feeHeads.map((h) => h.name).join(", ");
    } else if (amountPaid > studentDue + 0.009) {
      return res.status(400).json({
        success: false,
        message: `Amount cannot exceed remaining due ₹${studentDue}`,
      });
    }

    const voucherId = req.body.voucherId || null;

    const counterId = `receiptNo_${schoolId}`;
    const counter = await Counter.findOneAndUpdate(
      { _id: counterId },
      {
        $inc: { seq: 1 },
        $setOnInsert: { schoolId: schId },
      },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
    );

    const receiptId = `RCP-${counter.seq}`;
    const finalRemarks =
      remarks ||
      (periodRemark ? `Fee payment — ${periodRemark}` : "") ||
      "";

    const newPayment = await Payment.create({
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
    }

    student.totalPaid = (Number(student.totalPaid) || 0) + Number(amountPaid);
    student.totalDue =
      Math.round(((Number(student.finalFee) || 0) - student.totalPaid) * 100) /
      100;
    await student.save();

    await createNotificationHelper({
      title: `Fee Payment Received: ${amountPaid}`,
      message: `fee collected from ${student.firstName} ${student.lastName} Amount: ${amountPaid}${
        periodRemark ? ` (${periodRemark})` : ""
      }. Remaining Due: ${student.totalDue}`,
      notificationType: "fee",
      targets: [{ type: "student", studentId: student._id }],
      schoolId,
      createdBy: req.user._id,
    });

    return res.status(200).json({
      success: true,
      message: "Payment processed successfully",
      data: {
        receipt: newPayment,
        updatedBalances: {
          totalPaid: student.totalPaid,
          totalDue: student.totalDue,
        },
      },
    });
  } catch (error) {
    console.error("Fee Collection Error:", error);
    return res.status(500).json({ message: "Server error during payment" });
  }
};

export const collectStudentFee = collectStudentFeeInternal;

//  get all history of that particular school students
export const AllStudentHistory = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const search = (req.query.search || "").trim();
    const month = parseInt(req.query.month) || null;
    const year = parseInt(req.query.year) || null;
    const schoolId = req.user.school_id;

    if (!schoolId) {
      return res
        .status(400)
        .json({ success: false, message: "School ID required" });
    }

    const initialMatch = {
      schoolId: new mongoose.Types.ObjectId(schoolId),
    };

    if (year) {
      initialMatch["$expr"] = { $eq: [{ $year: "$paidDate" }, year] };
    }
    if (month) {
      if (initialMatch["$expr"]) {
        initialMatch["$expr"] = {
          $and: [
            initialMatch["$expr"],
            { $eq: [{ $month: "$paidDate" }, month] },
          ],
        };
      } else {
        initialMatch["$expr"] = { $eq: [{ $month: "$paidDate" }, month] };
      }
    }

    let studentMatch = {};
    if (search) {
      const words = search.split(/\s+/);
      const wordConditions = words.map((word) => ({
        $or: [
          { "studentData.firstName": { $regex: word, $options: "i" } },
          { "studentData.lastName": { $regex: word, $options: "i" } },
          { "studentData.studentId": { $regex: word, $options: "i" } },
          { receiptNo: { $regex: word, $options: "i" } },
        ],
      }));
      studentMatch = { $and: wordConditions };
    }

    const pipeline = [
      { $match: initialMatch },
      {
        $lookup: {
          from: "students",
          localField: "studentId",
          foreignField: "_id",
          as: "studentData",
        },
      },
      {
        $unwind: {
          path: "$studentData",
          preserveNullAndEmptyArrays: true,
        },
      },

      /* ─── NEW STEP: Join with Classes and Sections ─── */
      {
        $lookup: {
          from: "classes", // Make sure this is your actual collection name
          localField: "studentData.classId",
          foreignField: "_id",
          as: "classDetails",
        },
      },
      { $unwind: { path: "$classDetails", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "sections", // Make sure this is your actual collection name
          localField: "studentData.sectionId",
          foreignField: "_id",
          as: "sectionDetails",
        },
      },
      {
        $unwind: { path: "$sectionDetails", preserveNullAndEmptyArrays: true },
      },
      /* ────────────────────────────────────────────── */

      { $match: studentMatch },

      {
        $facet: {
          records: [
            { $sort: { paidDate: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                receiptNo: 1,
                amountPaid: 1,
                paymentMode: 1,
                paidDate: 1,
                remarks: 1,
                studentId: {
                  _id: "$studentData._id",
                  studentId: "$studentData.studentId",
                  firstName: "$studentData.firstName",
                  lastName: "$studentData.lastName",
                  // Use the joined names from classDetails and sectionDetails
                  className: "$classDetails.name",
                  section: "$sectionDetails.name",
                },
              },
            },
          ],
          totalCount: [{ $count: "count" }],
          totalAmount: [
            { $group: { _id: null, sum: { $sum: "$amountPaid" } } },
          ],
        },
      },
    ];

    const [result] = await Payment.aggregate(pipeline);

    const records = result.records || [];
    const total = result.totalCount[0]?.count || 0;
    const totalAmount = result.totalAmount[0]?.sum || 0;
    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      Allhistory: records,
      pagination: { total, totalPages, currentPage: page, limit },
      summary: { totalAmount, appliedFilters: { search, month, year } },
    });
  } catch (error) {
    console.error("AllStudentHistory error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch fee history",
      error: error.message,
    });
  }
};

// all defaulter of particular school students
export const getAllDefaulter = async (req, res) => {
  try {
    // 1. Extract classId (not className) from query
    const { classId, search, page = 1, limit = 10 } = req.query;
    const schoolId = req.user?.school_id;
    if (!schoolId)
      return res.status(400).json({ message: "School Id is required" });

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pageSize = parseInt(limit);
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 2. Build matchQuery using classId
    let matchQuery = {
      schoolId: new mongoose.Types.ObjectId(schoolId),
    };

    // Use classId because your Schema uses classId
    if (classId) matchQuery.classId = new mongoose.Types.ObjectId(classId);

    if (search) {
      matchQuery.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { studentId: { $regex: search, $options: "i" } },
      ];
    }

    const result = await Student.aggregate([
      { $match: matchQuery },

      // JOIN with Classes to get the Name for the UI
      {
        $lookup: {
          from: "classes",
          localField: "classId",
          foreignField: "_id",
          as: "classInfo",
        },
      },
      { $unwind: { path: "$classInfo", preserveNullAndEmptyArrays: true } },

      // JOIN with Payments
      {
        $lookup: {
          from: "payments",
          let: { studId: "$_id" },
          pipeline: [
            {
              $match: {
                ...(req.academicYear && !req.academicYearAll
                  ? { academicYear: req.academicYear }
                  : {}),
                $expr: {
                  $and: [
                    { $eq: ["$studentId", "$$studId"] },
                    {
                      $eq: ["$schoolId", new mongoose.Types.ObjectId(schoolId)],
                    },
                  ],
                },
              },
            },
          ],
          as: "paymentHistory",
        },
      },

      {
        $addFields: {
          // Map the joined class name to a field the UI expects
          className: "$classInfo.name",
          hasPaidThisMonth: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: "$paymentHistory",
                    as: "p",
                    cond: { $gte: ["$$p.paidDate", startOfCurrentMonth] },
                  },
                },
              },
              0,
            ],
          },
          lastPayment: {
            $arrayElemAt: [
              {
                $sortArray: {
                  input: "$paymentHistory",
                  sortBy: { paidDate: -1 },
                },
              },
              0,
            ],
          },
          calculatedDue: {
            $subtract: ["$finalFee", { $ifNull: ["$totalPaid", 0] }],
          },
        },
      },

      { $match: { hasPaidThisMonth: false, calculatedDue: { $gt: 0 } } },

      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: skip }, { $limit: pageSize }],
        },
      },
    ]);

    const defaulters = result[0]?.data || [];
    const totalRecords = result[0]?.metadata[0]?.total || 0;

    res.status(200).json({
      success: true,
      defaulters,
      totalRecords,
      totalPages: Math.ceil(totalRecords / pageSize),
      currentPage: parseInt(page),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// all defaulter of particular school students for super admin
export const getAllAdminDefaulter = async (req, res) => {
  try {
    if (req.user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }
    // 1. Extract classId (not className) from query
    const { schoolId, classId, search, page = 1, limit = 10 } = req.query;
    if (!schoolId)
      return res.status(400).json({ message: "School Id is required" });

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pageSize = parseInt(limit);
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 2. Build matchQuery using classId
    let matchQuery = {
      schoolId: new mongoose.Types.ObjectId(schoolId),
    };

    // Use classId because your Schema uses classId
    if (classId) matchQuery.classId = new mongoose.Types.ObjectId(classId);

    if (search) {
      matchQuery.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { studentId: { $regex: search, $options: "i" } },
      ];
    }

    const result = await Student.aggregate([
      { $match: matchQuery },

      // JOIN with Classes to get the Name for the UI
      {
        $lookup: {
          from: "classes",
          localField: "classId",
          foreignField: "_id",
          as: "classInfo",
        },
      },
      { $unwind: { path: "$classInfo", preserveNullAndEmptyArrays: true } },

      // JOIN with Payments
      {
        $lookup: {
          from: "payments",
          let: { studId: "$_id" },
          pipeline: [
            {
              $match: {
                ...(req.academicYear && !req.academicYearAll
                  ? { academicYear: req.academicYear }
                  : {}),
                $expr: {
                  $and: [
                    { $eq: ["$studentId", "$$studId"] },
                    {
                      $eq: ["$schoolId", new mongoose.Types.ObjectId(schoolId)],
                    },
                  ],
                },
              },
            },
          ],
          as: "paymentHistory",
        },
      },

      {
        $addFields: {
          // Map the joined class name to a field the UI expects
          className: "$classInfo.name",
          hasPaidThisMonth: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: "$paymentHistory",
                    as: "p",
                    cond: { $gte: ["$$p.paidDate", startOfCurrentMonth] },
                  },
                },
              },
              0,
            ],
          },
          lastPayment: {
            $arrayElemAt: [
              {
                $sortArray: {
                  input: "$paymentHistory",
                  sortBy: { paidDate: -1 },
                },
              },
              0,
            ],
          },
          calculatedDue: {
            $subtract: ["$finalFee", { $ifNull: ["$totalPaid", 0] }],
          },
        },
      },

      { $match: { hasPaidThisMonth: false, calculatedDue: { $gt: 0 } } },

      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: skip }, { $limit: pageSize }],
        },
      },
    ]);

    const defaulters = result[0]?.data || [];
    const totalRecords = result[0]?.metadata[0]?.total || 0;

    res.status(200).json({
      success: true,
      defaulters,
      totalRecords,
      totalPages: Math.ceil(totalRecords / pageSize),
      currentPage: parseInt(page),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// all history of particular school students for super admin
export const getAllStudentAdminHistory = async (req, res) => {
  try {
    if (req.user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const schoolId = req.query.schoolId;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const search = (req.query.search || "").trim();
    const month = parseInt(req.query.month) || null;
    const year = parseInt(req.query.year) || null;

    if (!schoolId) {
      return res
        .status(400)
        .json({ success: false, message: "School ID required" });
    }

    const initialMatch = {
      schoolId: new mongoose.Types.ObjectId(schoolId),
    };

    if (year) {
      initialMatch["$expr"] = { $eq: [{ $year: "$paidDate" }, year] };
    }
    if (month) {
      if (initialMatch["$expr"]) {
        initialMatch["$expr"] = {
          $and: [
            initialMatch["$expr"],
            { $eq: [{ $month: "$paidDate" }, month] },
          ],
        };
      } else {
        initialMatch["$expr"] = { $eq: [{ $month: "$paidDate" }, month] };
      }
    }

    let studentMatch = {};
    if (search) {
      const words = search.split(/\s+/);
      const wordConditions = words.map((word) => ({
        $or: [
          { "studentData.firstName": { $regex: word, $options: "i" } },
          { "studentData.lastName": { $regex: word, $options: "i" } },
          { "studentData.studentId": { $regex: word, $options: "i" } },
          { receiptNo: { $regex: word, $options: "i" } },
        ],
      }));
      studentMatch = { $and: wordConditions };
    }

    const pipeline = [
      { $match: initialMatch },
      {
        $lookup: {
          from: "students",
          localField: "studentId",
          foreignField: "_id",
          as: "studentData",
        },
      },
      {
        $unwind: {
          path: "$studentData",
          preserveNullAndEmptyArrays: true,
        },
      },

      /* ─── NEW STEP: Join with Classes and Sections ─── */
      {
        $lookup: {
          from: "classes", // Make sure this is your actual collection name
          localField: "studentData.classId",
          foreignField: "_id",
          as: "classDetails",
        },
      },
      { $unwind: { path: "$classDetails", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "sections", // Make sure this is your actual collection name
          localField: "studentData.sectionId",
          foreignField: "_id",
          as: "sectionDetails",
        },
      },
      {
        $unwind: { path: "$sectionDetails", preserveNullAndEmptyArrays: true },
      },
      /* ────────────────────────────────────────────── */

      { $match: studentMatch },

      {
        $facet: {
          records: [
            { $sort: { paidDate: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                receiptNo: 1,
                amountPaid: 1,
                paymentMode: 1,
                paidDate: 1,
                remarks: 1,
                studentId: {
                  _id: "$studentData._id",
                  studentId: "$studentData.studentId",
                  firstName: "$studentData.firstName",
                  lastName: "$studentData.lastName",
                  // Use the joined names from classDetails and sectionDetails
                  className: "$classDetails.name",
                  section: "$sectionDetails.name",
                },
              },
            },
          ],
          totalCount: [{ $count: "count" }],
          totalAmount: [
            { $group: { _id: null, sum: { $sum: "$amountPaid" } } },
          ],
        },
      },
    ];

    const [result] = await Payment.aggregate(pipeline);

    const records = result.records || [];
    const total = result.totalCount[0]?.count || 0;
    const totalAmount = result.totalAmount[0]?.sum || 0;
    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      Allhistory: records,
      pagination: { total, totalPages, currentPage: page, limit },
      summary: { totalAmount, appliedFilters: { search, month, year } },
    });
  } catch (error) {
    console.error("AllStudentHistory error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch fee history",
      error: error.message,
    });
  }
};

const getAppliedFeeAmount = (student, fee, ctx = {}) => {
  if (!fee) return 0;

  const batch = normalizeFeeBatch(student?.feeBatch || student?.feeCategory);
  const appliesTo = normalizeAppliesTo(fee.appliesTo);
  if (appliesTo !== "All" && appliesTo !== batch) {
    return 0;
  }

  const category = normalizeFeeCategory(fee.category);
  const feeName = String(fee.name || "").toLowerCase();
  const selectedOptionalFees = (student.selectedOptionalFees || []).map(String);
  const isSelectedOptional = selectedOptionalFees.includes(String(fee._id));

  const looksTransport =
    category === "Transport" ||
    feeName.includes("bus") ||
    feeName.includes("transport");
  const looksHostel =
    category === "Hostel" ||
    feeName.includes("hostel") ||
    feeName.includes("boarding");

  const hasTransport = Boolean(student.transport);
  const studentType = String(student.studentType || "").toLowerCase();
  const hasHostel =
    ctx.hasHostel === true ||
    studentType.includes("boarder") ||
    studentType.includes("hostel");

  // Transport / Hostel heads — apply when student opted in
  if (looksTransport) {
    if (hasTransport || isSelectedOptional) return fee.amount || 0;
    if (!fee.isOptional) return 0;
    return 0;
  }
  if (looksHostel) {
    if (hasHostel || isSelectedOptional) return fee.amount || 0;
    if (!fee.isOptional) return 0;
    return 0;
  }

  // Other optional heads need explicit selection
  if (fee.isOptional) {
    return isSelectedOptional ? fee.amount || 0 : 0;
  }

  // Mandatory general / other
  return fee.amount || 0;
};

const buildStudentFeeResponse = async ({ studentId, schoolId }) => {
  const student = await Student.findOne({
    _id: studentId,
    schoolId,
  })
    .populate({ path: "classId", select: "name" })
    .populate({ path: "sectionId", select: "name" })
    .lean();

  if (!student) {
    return null;
  }

  const feeStructure = await FeeStructure.findOne({
    class: student.classId?._id || student.classId,
    schoolId,
  }).lean();

  const payments = await Payment.find({ studentId: student._id, schoolId })
    .sort({ paidDate: -1 })
    .lean();

  const hostelResident = await HostelResident.findOne({
    schoolId,
    studentId: student._id,
    status: "Active",
  })
    .select("_id")
    .lean();

  const feeCtx = { hasHostel: Boolean(hostelResident) };

  const breakdown = (feeStructure?.fees || [])
    .map((fee) => ({
      _id: fee._id,
      name: fee.name,
      amount: getAppliedFeeAmount(student, fee, feeCtx),
      isOptional: !!fee.isOptional,
      category: normalizeFeeCategory(fee.category),
      appliesTo: normalizeAppliesTo(fee.appliesTo),
    }))
    .filter((fee) => fee.amount > 0);

  // Head-wise paid/due for checkbox payment UI (admin + parent)
  const heads = (() => {
    try {
      return typeof computeHeadBalances === "function"
        ? computeHeadBalances(breakdown, payments)
        : breakdown.map((f) => ({
            ...f,
            paid: 0,
            due: Number(f.amount) || 0,
          }));
    } catch {
      return breakdown.map((f) => ({
        ...f,
        paid: 0,
        due: Number(f.amount) || 0,
      }));
    }
  })();

  const totalFee = Number(student.totalFee) || Number(student.finalFee) || 0;
  const finalFee = Number(student.finalFee) || 0;
  const totalPaid = Number(student.totalPaid) || 0;
  const storedDue = Number(student.totalDue);
  const discountValue = Number(student.discountValue) || 0;
  const discountAmount = Math.max(0, totalFee - finalFee);
  const totalDue = Math.max(
    0,
    Number.isFinite(storedDue) ? storedDue : finalFee - totalPaid,
  );

  const structureFrequency = normalizeFeeFrequency(feeStructure?.frequency);
  const studentFrequency = student.feeFrequency
    ? normalizeFeeFrequency(student.feeFrequency)
    : null;
  const feeFrequency = studentFrequency || structureFrequency;

  const { installments, installmentCount, frequency } = buildInstallments({
    finalFee,
    frequency: feeFrequency,
    payments,
    totalPaid,
  });

  return {
    success: true,
    student: {
      _id: student._id,
      name: `${student.firstName} ${student.lastName}`.trim(),
      className: student.classId?.name || "",
      section: student.sectionId?.name || "",
      rollNo: student.rollNo || "",
    },
    feeStructure: breakdown,
    heads,
    feeFrequency: frequency,
    installmentCount,
    installments,
    finalFee,
    totalFee,
    totalFees: finalFee,
    discountType: student.discountType || "",
    discountValue,
    discountAmount,
    totalPaid,
    totalDue,
    balanceDue: totalDue,
    paidPercent: finalFee > 0 ? Math.round((totalPaid / finalFee) * 100) : 0,
    payments,
  };
};

export const getMyFeeDetails = async (req, res) => {
  try {
    const studentId = req.user?.student_id;
    const schoolId = req.user?.school_id;

    if (!studentId || !schoolId) {
      return res.status(400).json({
        success: false,
        message: "User student context missing",
      });
    }

    // ✅ Fetch student
    const feeDetails = await buildStudentFeeResponse({ studentId, schoolId });

    if (!feeDetails) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    return res.json({
      ...feeDetails,
      breakdown: feeDetails.feeStructure,
    });
  } catch (err) {
    console.error("getMyFeeDetails error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const notifyAllDefaulters = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    if (!schoolId) {
      return res
        .status(400)
        .json({ success: false, message: "School ID required" });
    }

    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Reuse same defaulter logic from getAllDefaulter
    const defaulters = await Student.aggregate([
      { $match: { schoolId: new mongoose.Types.ObjectId(schoolId) } },
      {
        $lookup: {
          from: "payments",
          let: { studId: "$_id" },
          pipeline: [
            {
              $match: {
                ...(req.academicYear && !req.academicYearAll
                  ? { academicYear: req.academicYear }
                  : {}),
                $expr: {
                  $and: [
                    { $eq: ["$studentId", "$$studId"] },
                    {
                      $eq: ["$schoolId", new mongoose.Types.ObjectId(schoolId)],
                    },
                  ],
                },
              },
            },
          ],
          as: "paymentHistory",
        },
      },
      {
        $addFields: {
          hasPaidThisMonth: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: "$paymentHistory",
                    as: "p",
                    cond: { $gte: ["$$p.paidDate", startOfCurrentMonth] },
                  },
                },
              },
              0,
            ],
          },
          calculatedDue: {
            $subtract: ["$finalFee", { $ifNull: ["$totalPaid", 0] }],
          },
        },
      },
      // Only students who haven't paid this month and still owe money
      { $match: { hasPaidThisMonth: false, calculatedDue: { $gt: 0 } } },
      { $project: { _id: 1, firstName: 1, lastName: 1, calculatedDue: 1 } },
    ]);

    if (defaulters.length === 0) {
      return res
        .status(200)
        .json({ success: true, message: "No defaulters found" });
    }

    // Send one notification per defaulter
    const notifications = defaulters.map((student) =>
      createNotificationHelper({
        title: `Fee Due Reminder`,
        message: `Dear ${student.firstName} ${student.lastName}, you have a pending fee due of ₹${student.calculatedDue}. Please clear it as soon as possible.`,
        notificationType: "fee",
        targets: [{ type: "student", studentId: student._id }],
        schoolId,
        createdBy: req.user._id,
      }),
    );

    // Fire all in parallel
    await Promise.all(notifications);

    return res.status(200).json({
      success: true,
      message: `Notifications sent to ${defaulters.length} defaulters`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const notifyDefaulter = async (req, res) => {
  try {
    const { studentId } = req.params;
    const schoolId = req.user.school_id;

    const student = await Student.findById(studentId)
      .select("firstName lastName totalPaid finalFee")
      .lean();

    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    const due = (student.finalFee || 0) - (student.totalPaid || 0);

    await createNotificationHelper({
      title: `Fee Due Reminder`,
      message: `Dear ${student.firstName} ${student.lastName}, you have a pending fee due of ₹${due}. Please clear it as soon as possible.`,
      notificationType: "fee",
      targets: [{ type: "student", studentId: student._id }],
      schoolId,
      createdBy: req.user._id,
    });

    return res
      .status(200)
      .json({ success: true, message: "Notification sent to student" });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/fees/receipt/:paymentId — printable fee receipt
// ─────────────────────────────────────────────────────────────
export const getFeeReceipt = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const role = req.user?.role;

    if (!paymentId || !mongoose.Types.ObjectId.isValid(paymentId)) {
      return res.status(400).json({ success: false, message: "Invalid payment id" });
    }

    const payment = await Payment.findById(paymentId).lean();
    if (!payment) {
      return res.status(404).json({ success: false, message: "Receipt not found" });
    }

    if (role === "student_admin") {
      if (String(payment.studentId) !== String(req.user.student_id)) {
        return res.status(403).json({ success: false, message: "Not authorized" });
      }
    } else if (role === "school_admin" || role === "staff_admin" || role === "teacher_admin") {
      if (String(payment.schoolId) !== String(req.user.school_id)) {
        return res.status(403).json({ success: false, message: "Not authorized" });
      }
    } else if (role !== "super_admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const [student, school] = await Promise.all([
      Student.findById(payment.studentId)
        .populate("classId", "name")
        .populate("sectionId", "name")
        .select(
          "firstName lastName studentId rollNo fatherName totalFee finalFee totalPaid totalDue classId sectionId",
        )
        .lean(),
      School.findById(payment.schoolId)
        .select("school_name school_logo address contact_phone contact_email")
        .lean(),
    ]);

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    return res.json({
      success: true,
      receipt: {
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
      },
      student: {
        _id: student._id,
        name: `${student.firstName || ""} ${student.lastName || ""}`.trim(),
        studentId: student.studentId || "",
        rollNo: student.rollNo || "",
        fatherName: student.fatherName || "",
        className: student.classId?.name || "",
        sectionName: student.sectionId?.name || "",
        finalFee: student.finalFee || 0,
        totalPaid: student.totalPaid || 0,
        totalDue: student.totalDue || 0,
      },
      school: {
        name: school?.school_name || "",
        logo: school?.school_logo || "",
        address: school?.address || "",
        phone: school?.contact_phone || "",
        email: school?.contact_email || "",
      },
    });
  } catch (error) {
    console.error("getFeeReceipt error:", error);
    return res.status(500).json({ success: false, message: "Failed to load receipt" });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/fees/financial-report — school / super admin reports
// Query: from & to (YYYY-MM-DD) preferred; legacy year / month still supported
// ─────────────────────────────────────────────────────────────
export const getFinancialReport = async (req, res) => {
  try {
    const role = req.user?.role;
    let schoolId = req.user?.school_id;

    if (role === "super_admin") {
      schoolId = req.query.schoolId;
      if (!schoolId) {
        return res.status(400).json({
          success: false,
          message: "schoolId is required for admin reports",
        });
      }
    } else if (!["school_admin", "staff_admin"].includes(role)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    if (!schoolId) {
      return res.status(400).json({ success: false, message: "School ID required" });
    }

    const schoolObjectId = new mongoose.Types.ObjectId(schoolId);

    const ymdRe = /^\d{4}-\d{2}-\d{2}$/;
    const fromRaw = String(req.query.from || "").trim();
    const toRaw = String(req.query.to || "").trim();
    const year = parseInt(req.query.year, 10) || null;
    const month = parseInt(req.query.month, 10) || null;

    let rangeStart = null;
    let rangeEnd = null;

    if (ymdRe.test(fromRaw) && ymdRe.test(toRaw)) {
      rangeStart = new Date(`${fromRaw}T00:00:00.000Z`);
      rangeEnd = new Date(`${toRaw}T23:59:59.999Z`);
      if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid from/to date",
        });
      }
      if (rangeStart > rangeEnd) {
        return res.status(400).json({
          success: false,
          message: "From date must be on or before to date",
        });
      }
    } else {
      const y = year || new Date().getFullYear();
      if (month) {
        rangeStart = new Date(Date.UTC(y, month - 1, 1, 0, 0, 0, 0));
        rangeEnd = new Date(Date.UTC(y, month, 0, 23, 59, 59, 999));
      } else {
        rangeStart = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0));
        rangeEnd = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
      }
    }

    const dateMatch = {
      schoolId: schoolObjectId,
      paidDate: { $gte: rangeStart, $lte: rangeEnd },
    };

    // Drill-down: single class payments for the selected period
    const classIdParam = String(req.query.classId || "").trim();
    if (classIdParam) {
      const isUnassigned =
        classIdParam === "unassigned" ||
        classIdParam === "null" ||
        classIdParam === "undefined";

      let classObjectId = null;
      if (!isUnassigned) {
        if (!mongoose.Types.ObjectId.isValid(classIdParam)) {
          return res.status(400).json({
            success: false,
            message: "Invalid classId",
          });
        }
        classObjectId = new mongoose.Types.ObjectId(classIdParam);
      }

      const classPayments = await Payment.aggregate([
        { $match: dateMatch },
        {
          $lookup: {
            from: "students",
            localField: "studentId",
            foreignField: "_id",
            as: "student",
          },
        },
        { $unwind: { path: "$student", preserveNullAndEmptyArrays: true } },
        {
          $match: isUnassigned
            ? {
                $or: [
                  { "student.classId": null },
                  { "student.classId": { $exists: false } },
                ],
              }
            : { "student.classId": classObjectId },
        },
        {
          $lookup: {
            from: "classes",
            localField: "student.classId",
            foreignField: "_id",
            as: "classDoc",
          },
        },
        { $unwind: { path: "$classDoc", preserveNullAndEmptyArrays: true } },
        { $sort: { paidDate: -1 } },
        {
          $facet: {
            totals: [
              {
                $group: {
                  _id: null,
                  total: { $sum: "$amountPaid" },
                  count: { $sum: 1 },
                  className: {
                    $first: { $ifNull: ["$classDoc.name", "Unassigned"] },
                  },
                },
              },
            ],
            byMode: [
              {
                $group: {
                  _id: "$paymentMode",
                  total: { $sum: "$amountPaid" },
                  count: { $sum: 1 },
                },
              },
              { $sort: { total: -1 } },
            ],
            payments: [
              {
                $project: {
                  _id: 1,
                  receiptNo: 1,
                  amountPaid: 1,
                  paymentMode: 1,
                  paidDate: 1,
                  utr: 1,
                  transactionId: 1,
                  studentName: {
                    $trim: {
                      input: {
                        $concat: [
                          { $ifNull: ["$student.firstName", ""] },
                          " ",
                          { $ifNull: ["$student.lastName", ""] },
                        ],
                      },
                    },
                  },
                  studentCode: "$student.studentId",
                  rollNo: "$student.rollNo",
                },
              },
            ],
          },
        },
      ]);

      const facet = classPayments[0] || {};
      const totals = facet.totals?.[0] || {
        total: 0,
        count: 0,
        className: isUnassigned ? "Unassigned" : "Class",
      };

      let className = totals.className || "Unassigned";
      if (!isUnassigned && classObjectId) {
        const classDoc = await Class.findById(classObjectId).select("name").lean();
        if (classDoc?.name) className = classDoc.name;
      }

      return res.json({
        success: true,
        classDetail: {
          classId: isUnassigned ? null : String(classObjectId),
          className,
          total: totals.total || 0,
          count: totals.count || 0,
          byMode: (facet.byMode || []).map((r) => ({
            mode: r._id || "Unknown",
            total: r.total,
            count: r.count,
          })),
          payments: facet.payments || [],
          filters: {
            from: rangeStart.toISOString(),
            to: rangeEnd.toISOString(),
          },
        },
      });
    }

    const [agg] = await Payment.aggregate([
      { $match: dateMatch },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                totalCollected: { $sum: "$amountPaid" },
                paymentCount: { $sum: 1 },
                avgPayment: { $avg: "$amountPaid" },
              },
            },
          ],
          byMode: [
            {
              $group: {
                _id: "$paymentMode",
                total: { $sum: "$amountPaid" },
                count: { $sum: 1 },
              },
            },
            { $sort: { total: -1 } },
          ],
          byMonth: [
            {
              $group: {
                _id: {
                  year: { $year: "$paidDate" },
                  month: { $month: "$paidDate" },
                },
                total: { $sum: "$amountPaid" },
                count: { $sum: 1 },
              },
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
          ],
          recent: [
            { $sort: { paidDate: -1 } },
            { $limit: 10 },
            {
              $lookup: {
                from: "students",
                localField: "studentId",
                foreignField: "_id",
                as: "student",
              },
            },
            { $unwind: { path: "$student", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 1,
                receiptNo: 1,
                amountPaid: 1,
                paymentMode: 1,
                paidDate: 1,
                studentName: {
                  $trim: {
                    input: {
                      $concat: [
                        { $ifNull: ["$student.firstName", ""] },
                        " ",
                        { $ifNull: ["$student.lastName", ""] },
                      ],
                    },
                  },
                },
                studentCode: "$student.studentId",
              },
            },
          ],
        },
      },
    ]);

    const byClass = await Payment.aggregate([
      { $match: dateMatch },
      {
        $lookup: {
          from: "students",
          localField: "studentId",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: { path: "$student", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "classes",
          localField: "student.classId",
          foreignField: "_id",
          as: "classDoc",
        },
      },
      { $unwind: { path: "$classDoc", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$classDoc._id",
          className: { $first: { $ifNull: ["$classDoc.name", "Unassigned"] } },
          total: { $sum: "$amountPaid" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const dueSummary = await Student.aggregate([
      { $match: { schoolId: schoolObjectId } },
      {
        $group: {
          _id: null,
          totalDue: { $sum: { $ifNull: ["$totalDue", 0] } },
          totalPaidAllTime: { $sum: { $ifNull: ["$totalPaid", 0] } },
          studentsWithDue: {
            $sum: {
              $cond: [{ $gt: [{ $ifNull: ["$totalDue", 0] }, 0] }, 1, 0],
            },
          },
          studentCount: { $sum: 1 },
        },
      },
    ]);

    const school = await School.findById(schoolId)
      .select("school_name school_logo address contact_phone contact_email")
      .lean();

    const totals = agg?.totals?.[0] || {
      totalCollected: 0,
      paymentCount: 0,
      avgPayment: 0,
    };

    const monthNames = [
      "",
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    return res.json({
      success: true,
      school: {
        _id: schoolId,
        name: school?.school_name || "",
        logo: school?.school_logo || "",
        address: school?.address || "",
        phone: school?.contact_phone || "",
        email: school?.contact_email || "",
      },
      filters: {
        from: rangeStart.toISOString(),
        to: rangeEnd.toISOString(),
        year: year || null,
        month: month || null,
      },
      summary: {
        totalCollected: totals.totalCollected || 0,
        paymentCount: totals.paymentCount || 0,
        avgPayment: Math.round(totals.avgPayment || 0),
        outstandingDue: dueSummary[0]?.totalDue || 0,
        studentsWithDue: dueSummary[0]?.studentsWithDue || 0,
        studentCount: dueSummary[0]?.studentCount || 0,
        totalPaidAllTime: dueSummary[0]?.totalPaidAllTime || 0,
      },
      byMode: (agg?.byMode || []).map((r) => ({
        mode: r._id || "Unknown",
        total: r.total,
        count: r.count,
      })),
      byMonth: (agg?.byMonth || []).map((r) => {
        const m = r._id?.month;
        const y = r._id?.year;
        return {
          month: m,
          year: y,
          monthLabel: `${monthNames[m] || m} ${y || ""}`.trim(),
          total: r.total,
          count: r.count,
        };
      }),
      byClass: byClass.map((r) => ({
        classId: r._id,
        className: r.className,
        total: r.total,
        count: r.count,
      })),
      recentPayments: agg?.recent || [],
    });
  } catch (error) {
    console.error("getFinancialReport error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate financial report",
      error: error.message,
    });
  }
};

/**
 * GET /api/fees/reports
 * type: daily | weekly | collected | due | defaulters
 * Optional: from, to (YYYY-MM-DD), classId, day (for daily), weekStart (for weekly)
 */
export const getFeeTypedReport = async (req, res) => {
  try {
    const role = req.user?.role;
    let schoolId = req.user?.school_id;

    if (role === "super_admin") {
      schoolId = req.query.schoolId;
      if (!schoolId) {
        return res.status(400).json({
          success: false,
          message: "schoolId is required for admin reports",
        });
      }
    } else if (!["school_admin", "staff_admin"].includes(role)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    if (!schoolId) {
      return res.status(400).json({ success: false, message: "School ID required" });
    }

    const schoolObjectId = new mongoose.Types.ObjectId(schoolId);
    const type = String(req.query.type || "daily").trim();
    const allowed = new Set(["daily", "weekly", "collected", "due", "defaulters"]);
    if (!allowed.has(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid type. Use daily, weekly, collected, due, or defaulters.",
      });
    }

    const ymdRe = /^\d{4}-\d{2}-\d{2}$/;
    const toYmd = (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    };
    const startOfDayLocal = (ymd) => {
      const [y, m, d] = ymd.split("-").map(Number);
      return new Date(y, m - 1, d, 0, 0, 0, 0);
    };
    const endOfDayLocal = (ymd) => {
      const [y, m, d] = ymd.split("-").map(Number);
      return new Date(y, m - 1, d, 23, 59, 59, 999);
    };

    const today = new Date();
    let fromYmd = String(req.query.from || "").trim();
    let toYmdVal = String(req.query.to || "").trim();
    const dayParam = String(req.query.day || "").trim();
    const weekStartParam = String(req.query.weekStart || "").trim();

    if (type === "daily") {
      const day = ymdRe.test(dayParam)
        ? dayParam
        : ymdRe.test(fromYmd)
          ? fromYmd
          : toYmd(today);
      fromYmd = day;
      toYmdVal = day;
    } else if (type === "weekly") {
      let start;
      if (ymdRe.test(weekStartParam)) {
        start = startOfDayLocal(weekStartParam);
      } else if (ymdRe.test(fromYmd)) {
        start = startOfDayLocal(fromYmd);
      } else {
        start = new Date(today);
        const day = (start.getDay() + 6) % 7; // Monday=0
        start.setDate(start.getDate() - day);
        start.setHours(0, 0, 0, 0);
      }
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      fromYmd = toYmd(start);
      toYmdVal = toYmd(end);
    } else if (type === "collected") {
      if (!ymdRe.test(fromYmd)) fromYmd = toYmd(new Date(today.getFullYear(), today.getMonth(), 1));
      if (!ymdRe.test(toYmdVal)) toYmdVal = toYmd(today);
    }

    const classIdParam = String(req.query.classId || "").trim();
    let classFilter = null;
    if (classIdParam && mongoose.Types.ObjectId.isValid(classIdParam)) {
      classFilter = new mongoose.Types.ObjectId(classIdParam);
    }

    const school = await School.findById(schoolId)
      .select("school_name school_logo address contact_phone contact_email")
      .lean();

    const meta = {
      type,
      title:
        type === "daily"
          ? "Daily Fee Collection Report"
          : type === "weekly"
            ? "Weekly Fee Collection Report"
            : type === "collected"
              ? "Fees Collected Report"
              : type === "due"
                ? "Due Fees Report"
                : "Fee Defaulters Report",
      generatedAt: new Date().toISOString(),
      school: {
        _id: String(schoolId),
        name: school?.school_name || "",
        logo: school?.school_logo || "",
        address: school?.address || "",
        phone: school?.contact_phone || "",
        email: school?.contact_email || "",
      },
      filters: {
        from: fromYmd || null,
        to: toYmdVal || null,
        classId: classFilter ? String(classFilter) : null,
      },
    };

    const studentNameExpr = {
      $trim: {
        input: {
          $concat: [
            { $ifNull: ["$student.firstName", ""] },
            " ",
            { $ifNull: ["$student.lastName", ""] },
          ],
        },
      },
    };

    if (type === "daily" || type === "weekly" || type === "collected") {
      const rangeStart = startOfDayLocal(fromYmd);
      const rangeEnd = endOfDayLocal(toYmdVal);
      const match = {
        schoolId: schoolObjectId,
        paidDate: { $gte: rangeStart, $lte: rangeEnd },
      };

      const rows = await Payment.aggregate([
        { $match: match },
        {
          $lookup: {
            from: "students",
            localField: "studentId",
            foreignField: "_id",
            as: "student",
          },
        },
        { $unwind: { path: "$student", preserveNullAndEmptyArrays: true } },
        ...(classFilter
          ? [{ $match: { "student.classId": classFilter } }]
          : []),
        {
          $lookup: {
            from: "classes",
            localField: "student.classId",
            foreignField: "_id",
            as: "classDoc",
          },
        },
        { $unwind: { path: "$classDoc", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "sections",
            localField: "student.sectionId",
            foreignField: "_id",
            as: "sectionDoc",
          },
        },
        { $unwind: { path: "$sectionDoc", preserveNullAndEmptyArrays: true } },
        { $sort: { paidDate: -1 } },
        {
          $project: {
            _id: 1,
            receiptNo: 1,
            amountPaid: 1,
            paymentMode: 1,
            paidDate: 1,
            utr: 1,
            transactionId: 1,
            remarks: 1,
            periodKeys: 1,
            studentName: studentNameExpr,
            studentCode: "$student.studentId",
            rollNo: "$student.rollNo",
            parentMobile: {
              $ifNull: ["$student.fatherMobile", "$student.motherMobile"],
            },
            className: { $ifNull: ["$classDoc.name", "Unassigned"] },
            sectionName: { $ifNull: ["$sectionDoc.name", ""] },
          },
        },
      ]);

      const byModeMap = {};
      let totalCollected = 0;
      rows.forEach((row, index) => {
        row.sNo = index + 1;
        totalCollected += Number(row.amountPaid) || 0;
        const mode = row.paymentMode || "Unknown";
        byModeMap[mode] = (byModeMap[mode] || 0) + (Number(row.amountPaid) || 0);
      });

      return res.json({
        success: true,
        data: {
          meta,
          summary: {
            totalCollected,
            paymentCount: rows.length,
            byMode: Object.entries(byModeMap).map(([mode, total]) => ({
              mode,
              total,
            })),
          },
          rows,
        },
      });
    }

    // due / defaulters — student outstanding lists
    const studentMatch = { schoolId: schoolObjectId };
    if (classFilter) studentMatch.classId = classFilter;

    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const pipeline = [
      { $match: studentMatch },
      {
        $lookup: {
          from: "classes",
          localField: "classId",
          foreignField: "_id",
          as: "classInfo",
        },
      },
      { $unwind: { path: "$classInfo", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "sections",
          localField: "sectionId",
          foreignField: "_id",
          as: "sectionInfo",
        },
      },
      { $unwind: { path: "$sectionInfo", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "payments",
          let: { studId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$studentId", "$$studId"] },
                    { $eq: ["$schoolId", schoolObjectId] },
                  ],
                },
              },
            },
            { $sort: { paidDate: -1 } },
          ],
          as: "paymentHistory",
        },
      },
      {
        $addFields: {
          className: { $ifNull: ["$classInfo.name", "Unassigned"] },
          sectionName: { $ifNull: ["$sectionInfo.name", ""] },
          studentName: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$firstName", ""] },
                  " ",
                  { $ifNull: ["$lastName", ""] },
                ],
              },
            },
          },
          calculatedDue: {
            $max: [
              {
                $subtract: [
                  { $ifNull: ["$finalFee", 0] },
                  { $ifNull: ["$totalPaid", 0] },
                ],
              },
              0,
            ],
          },
          lastPayment: { $arrayElemAt: ["$paymentHistory", 0] },
          hasPaidThisMonth: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: "$paymentHistory",
                    as: "p",
                    cond: { $gte: ["$$p.paidDate", startOfCurrentMonth] },
                  },
                },
              },
              0,
            ],
          },
        },
      },
    ];

    if (type === "due") {
      pipeline.push({ $match: { calculatedDue: { $gt: 0 } } });
    } else {
      pipeline.push({
        $match: { calculatedDue: { $gt: 0 }, hasPaidThisMonth: false },
      });
    }

    pipeline.push(
      { $sort: { calculatedDue: -1, className: 1, studentName: 1 } },
      {
        $project: {
          _id: 1,
          studentName: 1,
          studentCode: "$studentId",
          rollNo: 1,
          className: 1,
          sectionName: 1,
          parentMobile: {
            $ifNull: ["$fatherMobile", "$motherMobile"],
          },
          finalFee: { $ifNull: ["$finalFee", 0] },
          totalPaid: { $ifNull: ["$totalPaid", 0] },
          dueAmount: "$calculatedDue",
          lastPaidDate: "$lastPayment.paidDate",
          lastPaidAmount: "$lastPayment.amountPaid",
          hasPaidThisMonth: 1,
        },
      },
    );

    const rows = await Student.aggregate(pipeline);
    rows.forEach((row, index) => {
      row.sNo = index + 1;
    });

    const totalDue = rows.reduce(
      (sum, row) => sum + (Number(row.dueAmount) || 0),
      0,
    );
    const totalPaid = rows.reduce(
      (sum, row) => sum + (Number(row.totalPaid) || 0),
      0,
    );

    return res.json({
      success: true,
      data: {
        meta,
        summary: {
          studentCount: rows.length,
          totalDue,
          totalPaid,
        },
        rows,
      },
    });
  } catch (error) {
    console.error("getFeeTypedReport error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate fee report",
    });
  }
};


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
      { _id: `receiptNo_${schoolId}` },
      { $inc: { seq: 1 }, $setOnInsert: { schoolId: schId } },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
    );
    const receiptId = `VCH-${counter.seq}`;

    const voucher = await Payment.create({
      studentId: sId,
      schoolId: schId,
      amountPaid: amount,
      paymentMode: "Voucher",
      remarks:
        remarks ||
        `Fee voucher — ${feeHeads.map((h) => h.name).join(", ")}`,
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
        message: `Refund cannot exceed total paid (₹${maxRefundable})`,
      });
    }

    const counter = await Counter.findOneAndUpdate(
      { _id: `receiptNo_${schoolId}` },
      { $inc: { seq: 1 }, $setOnInsert: { schoolId: schId } },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
    );
    const receiptId = `REF-${counter.seq}`;

    const refund = await Payment.create({
      studentId: sId,
      schoolId: schId,
      amountPaid: amount,
      paymentMode: "Refund",
      remarks:
        remarks ||
        reason ||
        (feeHeads.length
          ? `Fee refund — ${feeHeads.map((h) => h.name).join(", ")}`
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
      title: `Fee Refund: ₹${amount}`,
      message: `Refund of ₹${amount} processed for ${student.firstName} ${student.lastName}. Remaining Due: ₹${student.totalDue}`,
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
