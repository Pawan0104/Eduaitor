import mongoose from "mongoose";
import FeeStructure from "../models/feeStructure.js";
import Class from "../models/class.js";
import Student from "../models/student.js";
import Payment from "../models/payment.js";
import Counter from "../models/receiptCounter.js";
import School from "../models/school.js";
import { createNotificationHelper } from "./notificationController.js";
import Razorpay from "razorpay";

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
      });
    }

    return res.json({
      success: true,
      fees: feeStructure.fees || [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const addFeeComponent = async (req, res) => {
  try {
    const { name, amount, isOptional } = req.body; // 👈 Extract schoolId
    const schoolId = req.user?.school_id;

    if (!name || amount === undefined || !schoolId)
      return res
        .status(400)
        .json({ message: "Name, amount, and schoolId are required" });

    // Use BOTH class and schoolId to find or create the structure
    const doc = await FeeStructure.findOneAndUpdate(
      { class: req.params.classId, schoolId: schoolId },
      {
        $push: { fees: { name, amount, isOptional: !!isOptional } },
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
    const { name, amount, isOptional } = req.body; // 👈 Extract schoolId
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
    const amount = Number(req.body.amount);

    if (!studentId || !amount || amount <= 0 || !schoolId) {
      return res.status(400).json({
        success: false,
        message: "Student ID, a valid amount, and School ID are required",
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

    req.body.studentId = studentId;
    req.body.paymentMode = "Online";
    req.body.remarks = isDevOrder
      ? `Dev Gateway Payment - Order ID: ${orderId}, Payment ID: ${paymentId}`
      : `Razorpay Payment - Order ID: ${orderId}, Payment ID: ${paymentId}`;
    req.body.amountPaid = amountPaid;
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
    const { studentId, amountPaid, paymentMode, remarks } = req.body;
    const schoolId = req.user?.school_id;

    if (!studentId || amountPaid === undefined || !paymentMode || !schoolId) {
      return res.status(400).json({
        message:
          "studentId, amountPaid, paymentMode, and schoolId are required",
      });
    }
    // 0. validate school
    if (!schoolId) {
      return res.status(400).json({ message: "School ID is required" });
    }

    // 1. Explicitly Convert to ObjectId 👈 CHANGE THIS
    const sId = new mongoose.Types.ObjectId(studentId);
    const schId = new mongoose.Types.ObjectId(schoolId);

    // 2. Check student exists (Use the casted IDs)
    const student = await Student.findOne({ _id: sId, schoolId: schId });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // ... (Validation and Counter logic remains the same) ...

    const counterId = `receiptNo_${schoolId}`;
    const counter = await Counter.findOneAndUpdate(
      { _id: counterId },
      {
        $inc: { seq: 1 },
        $setOnInsert: { schoolId: schId }, // Use casted ID
      },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
    );

    const receiptId = `RCP-${counter.seq}`;

    // 5. Create payment record WITH OBJECT IDs 👈 CHANGE THIS
    const newPayment = await Payment.create({
      studentId: sId, // Use casted ID
      schoolId: schId, // Use casted ID
      amountPaid: Number(amountPaid),
      paymentMode,
      remarks: remarks || "",
      receiptNo: receiptId,
      paidDate: new Date(),
      razorpayOrderId: req.body.orderId || null,
      razorpayPaymentId: req.body.paymentId || null,
      razorpaySignature: req.body.signature || null,
    });

    // 6. Update student totals
    student.totalPaid = (Number(student.totalPaid) || 0) + Number(amountPaid);
    student.totalDue =
      Math.round(((Number(student.finalFee) || 0) - student.totalPaid) * 100) /
      100;
    await student.save();

    await createNotificationHelper({
      title: `Fee Payment Received: ${amountPaid}`,
      message: `fee collected from ${student.firstName} ${student.lastName} Amount: ${amountPaid}. Remaining Due: ${student.totalDue}`,
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

const getAppliedFeeAmount = (student, fee) => {
  if (!fee) return 0;

  // 🟡 OPTIONAL FEES (like Bus)
  if (fee.isOptional) {
    const feeName = fee.name?.toLowerCase() || "";
    const selectedOptionalFees = (student.selectedOptionalFees || []).map(
      String,
    );

    if (feeName.includes("bus") || feeName.includes("transport")) {
      return student.transport ? fee.amount : 0;
    }

    if (selectedOptionalFees.includes(String(fee._id))) {
      return fee.amount || 0;
    }

    return 0;
  }

  // 🟢 MANDATORY FEES
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

  const breakdown = (feeStructure?.fees || [])
    .map((fee) => ({
      _id: fee._id,
      name: fee.name,
      amount: getAppliedFeeAmount(student, fee),
      isOptional: fee.isOptional,
    }))
    .filter((fee) => fee.amount > 0);

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
        razorpayPaymentId: payment.razorpayPaymentId || "",
        paymentId: payment._id,
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
// Query: year, month?, schoolId? (required for super_admin)
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

    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const month = parseInt(req.query.month, 10) || null;
    const schoolObjectId = new mongoose.Types.ObjectId(schoolId);

    const dateMatch = {
      schoolId: schoolObjectId,
      $expr: {
        $and: [
          { $eq: [{ $year: "$paidDate" }, year] },
          ...(month ? [{ $eq: [{ $month: "$paidDate" }, month] }] : []),
        ],
      },
    };

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
                _id: { $month: "$paidDate" },
                total: { $sum: "$amountPaid" },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
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
      .select("school_name school_logo")
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
      },
      filters: { year, month },
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
      byMonth: (agg?.byMonth || []).map((r) => ({
        month: r._id,
        monthLabel: monthNames[r._id] || String(r._id),
        total: r.total,
        count: r.count,
      })),
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
