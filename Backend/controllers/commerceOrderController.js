import CommerceProduct from "../models/commerceProduct.js";
import CommerceOrder from "../models/commerceOrder.js";
import Student from "../models/student.js";
import {
  createRazorpayOrderForSchool,
  getSchoolRazorpay,
  verifyRazorpaySignatureForSchool,
} from "../utils/razorpayHelper.js";

const getSchoolId = (req) => req.user?.school_id;

const isParentOrStudent = (req) =>
  req.user?.loginAs === "parent" || req.user?.loginAs === "student";

const assertParentOwnsOrder = (req, order) => {
  if (!isParentOrStudent(req)) return true;
  return String(order.studentId || "") === String(req.user.student_id || "");
};

const nextOrderNumber = async (schoolId) => {
  const count = await CommerceOrder.countDocuments({ schoolId });
  return `ORD-${String(count + 1).padStart(5, "0")}`;
};

const buildOrderItems = async (schoolId, rawItems) => {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw Object.assign(new Error("At least one order item is required."), {
      status: 400,
    });
  }

  const items = [];
  let subtotal = 0;

  for (const row of rawItems) {
    const qty = Number(row.quantity);
    if (!row.productId || !qty || qty < 1) {
      throw Object.assign(new Error("Each item needs productId and quantity."), {
        status: 400,
      });
    }

    const product = await CommerceProduct.findOne({
      _id: row.productId,
      schoolId,
      status: "Active",
    });

    if (!product) {
      throw Object.assign(new Error("One or more products were not found."), {
        status: 400,
      });
    }

    if (product.stock < qty) {
      throw Object.assign(
        new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}`),
        { status: 400 }
      );
    }

    const lineTotal = Number(product.price) * qty;
    subtotal += lineTotal;
    items.push({
      productId: product._id,
      name: product.name,
      category: product.category,
      sku: product.sku || "",
      quantity: qty,
      unitPrice: product.price,
      lineTotal,
    });
  }

  return { items, subtotal, total: subtotal };
};

const deductStock = async (schoolId, items) => {
  for (const item of items) {
    const updated = await CommerceProduct.findOneAndUpdate(
      {
        _id: item.productId,
        schoolId,
        stock: { $gte: item.quantity },
      },
      { $inc: { stock: -item.quantity } },
      { new: true }
    );
    if (!updated) {
      throw Object.assign(
        new Error(`Could not deduct stock for ${item.name}.`),
        { status: 400 }
      );
    }
  }
};

const restoreStock = async (schoolId, items) => {
  for (const item of items) {
    await CommerceProduct.updateOne(
      { _id: item.productId, schoolId },
      { $inc: { stock: item.quantity } }
    );
  }
};

export const getOrders = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) {
      return res.status(403).json({ success: false, message: "School not identified." });
    }

    const { search, paymentStatus, orderStatus } = req.query;
    const filter = { schoolId };
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (orderStatus) filter.orderStatus = orderStatus;

    let orders = await CommerceOrder.find(filter)
      .populate("studentId", "firstName lastName studentId")
      .sort({ createdAt: -1 })
      .lean();

    if (search?.trim()) {
      const q = search.trim().toLowerCase();
      orders = orders.filter((o) => {
        const studentName = `${o.studentId?.firstName || ""} ${o.studentId?.lastName || ""}`
          .trim()
          .toLowerCase();
        return (
          o.orderNumber?.toLowerCase().includes(q) ||
          o.customerName?.toLowerCase().includes(q) ||
          studentName.includes(q) ||
          o.items?.some((i) => i.name?.toLowerCase().includes(q))
        );
      });
    }

    return res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};

export const getOrder = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const order = await CommerceOrder.findOne({
      _id: req.params.id,
      schoolId,
    })
      .populate("studentId", "firstName lastName studentId")
      .lean();

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    return res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

export const createOrder = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) {
      return res.status(403).json({ success: false, message: "School not identified." });
    }

    const { studentId, customerName, items: rawItems, notes, paymentMode } = req.body;
    const { items, subtotal, total } = await buildOrderItems(schoolId, rawItems);

    let resolvedStudent = null;
    if (studentId) {
      resolvedStudent = await Student.findOne({ _id: studentId, schoolId }).select(
        "firstName lastName"
      );
      if (!resolvedStudent) {
        return res.status(400).json({
          success: false,
          message: "Student not found for this school.",
        });
      }
    }

    const orderNumber = await nextOrderNumber(schoolId);
    const nameFromStudent = resolvedStudent
      ? `${resolvedStudent.firstName} ${resolvedStudent.lastName}`.trim()
      : "";

    const order = await CommerceOrder.create({
      schoolId,
      orderNumber,
      studentId: resolvedStudent?._id || null,
      customerName: customerName?.trim() || nameFromStudent || "Walk-in",
      items,
      subtotal,
      total,
      notes: notes?.trim() || "",
      paymentStatus: "Pending",
      paymentMode: paymentMode || "",
      orderStatus: "Placed",
    });

    // Cash / UPI at counter → mark paid + deduct stock immediately
    if (paymentMode === "Cash" || paymentMode === "UPI") {
      await deductStock(schoolId, items);
      order.paymentStatus = "Paid";
      order.paymentMode = paymentMode;
      order.paidAt = new Date();
      order.orderStatus = "Processing";
      await order.save();
    }

    const populated = await CommerceOrder.findById(order._id)
      .populate("studentId", "firstName lastName studentId")
      .lean();

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: populated,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const order = await CommerceOrder.findOne({
      _id: req.params.id,
      schoolId,
    });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    const { orderStatus, notes } = req.body;
    if (orderStatus) order.orderStatus = orderStatus;
    if (notes !== undefined) order.notes = String(notes).trim();

    if (orderStatus === "Cancelled" && order.paymentStatus === "Paid") {
      // optional: don't auto-refund stock unless was paid — restore stock on cancel if paid
      await restoreStock(schoolId, order.items);
      order.paymentStatus = "Refunded";
    }

    if (orderStatus === "Cancelled" && order.paymentStatus === "Pending") {
      order.paymentStatus = "Failed";
    }

    await order.save();
    return res.json({
      success: true,
      message: "Order updated successfully",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

export const markOrderPaidCash = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const order = await CommerceOrder.findOne({
      _id: req.params.id,
      schoolId,
    });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }
    if (order.paymentStatus === "Paid") {
      return res.status(400).json({ success: false, message: "Order is already paid." });
    }
    if (order.orderStatus === "Cancelled") {
      return res.status(400).json({ success: false, message: "Order is cancelled." });
    }

    await deductStock(schoolId, order.items);
    order.paymentStatus = "Paid";
    order.paymentMode = req.body.paymentMode === "UPI" ? "UPI" : "Cash";
    order.paidAt = new Date();
    if (order.orderStatus === "Placed") order.orderStatus = "Processing";
    await order.save();

    return res.json({
      success: true,
      message: "Order marked as paid",
      data: order,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/* -------- Razorpay (same school keys as fee collection) -------- */

export const initiateOrderPayment = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const order = await CommerceOrder.findOne({
      _id: req.params.id,
      schoolId,
    });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }
    if (!assertParentOwnsOrder(req, order)) {
      return res.status(403).json({
        success: false,
        message: "You can only pay for your own orders.",
      });
    }
    if (order.paymentStatus === "Paid") {
      return res.status(400).json({ success: false, message: "Order is already paid." });
    }
    if (order.orderStatus === "Cancelled") {
      return res.status(400).json({ success: false, message: "Order is cancelled." });
    }

    const school = await getSchoolRazorpay(schoolId);
    if (!school) {
      return res.status(400).json({ success: false, message: "School not found." });
    }

    const gateway = await createRazorpayOrderForSchool({
      school,
      amountRupees: order.total,
      receipt: `store_${order.orderNumber}_${Date.now()}`,
      notes: {
        schoolId: String(schoolId),
        commerceOrderId: String(order._id),
        orderNumber: order.orderNumber,
      },
    });

    order.razorpayOrderId = gateway.orderId;
    order.paymentMode = "Online";
    await order.save();

    return res.json({
      success: true,
      message: gateway.mock
        ? "Development payment gateway order created"
        : "Razorpay order initiated successfully",
      mock: gateway.mock,
      orderId: gateway.orderId,
      amount: gateway.amount,
      currency: gateway.currency,
      key_id: gateway.key_id,
      amountRupees: gateway.amountRupees,
      commerceOrderId: order._id,
      orderNumber: order.orderNumber,
    });
  } catch (error) {
    console.error("Commerce Razorpay init error:", error);
    return res.status(500).json({
      success: false,
      message:
        error?.error?.description ||
        error?.message ||
        "Failed to initiate payment",
    });
  }
};

export const verifyOrderPayment = async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    const { orderId, paymentId, signature } = req.body;

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({
        success: false,
        message: "Order ID, Payment ID and Signature are required.",
      });
    }

    const order = await CommerceOrder.findOne({
      _id: req.params.id,
      schoolId,
    });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }
    if (!assertParentOwnsOrder(req, order)) {
      return res.status(403).json({
        success: false,
        message: "You can only pay for your own orders.",
      });
    }
    if (order.paymentStatus === "Paid") {
      return res.json({
        success: true,
        message: "Order already paid",
        data: order,
      });
    }

    if (order.razorpayOrderId && order.razorpayOrderId !== orderId) {
      return res.status(400).json({
        success: false,
        message: "Payment order does not match this store order.",
      });
    }

    const school = await getSchoolRazorpay(schoolId);
    const ok = await verifyRazorpaySignatureForSchool({
      school,
      orderId,
      paymentId,
      signature,
    });

    if (!ok) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed. Signature mismatch.",
      });
    }

    await deductStock(schoolId, order.items);

    order.paymentStatus = "Paid";
    order.paymentMode = "Online";
    order.razorpayOrderId = orderId;
    order.razorpayPaymentId = paymentId;
    order.razorpaySignature = signature;
    order.paidAt = new Date();
    if (order.orderStatus === "Placed") order.orderStatus = "Processing";
    await order.save();

    const populated = await CommerceOrder.findById(order._id)
      .populate("studentId", "firstName lastName studentId")
      .lean();

    return res.json({
      success: true,
      message: "Payment verified successfully",
      data: populated,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    console.error("Commerce Razorpay verify error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify payment",
    });
  }
};

export const deleteOrder = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const order = await CommerceOrder.findOne({
      _id: req.params.id,
      schoolId,
    });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    if (order.paymentStatus === "Paid") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete a paid order. Cancel/refund it instead.",
      });
    }

    await order.deleteOne();
    return res.json({ success: true, message: "Order deleted successfully" });
  } catch (error) {
    next(error);
  }
};

/* -------- Parent / student store -------- */

export const getMyOrders = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const studentId = req.user?.student_id;

    if (!schoolId || !studentId) {
      return res.status(403).json({
        success: false,
        message: "Student account not identified.",
      });
    }

    const orders = await CommerceOrder.find({ schoolId, studentId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};

export const createParentOrder = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const studentId = req.user?.student_id;

    if (!schoolId || !studentId) {
      return res.status(403).json({
        success: false,
        message: "Student account not identified.",
      });
    }

    if (!isParentOrStudent(req)) {
      return res.status(403).json({
        success: false,
        message: "Only parents or students can place store orders here.",
      });
    }

    const student = await Student.findOne({ _id: studentId, schoolId }).select(
      "firstName lastName"
    );
    if (!student) {
      return res.status(400).json({
        success: false,
        message: "Student not found for this school.",
      });
    }

    const { items: rawItems, notes } = req.body;
    const { items, subtotal, total } = await buildOrderItems(schoolId, rawItems);
    const orderNumber = await nextOrderNumber(schoolId);

    const order = await CommerceOrder.create({
      schoolId,
      orderNumber,
      studentId: student._id,
      customerName: `${student.firstName} ${student.lastName}`.trim(),
      items,
      subtotal,
      total,
      notes: notes?.trim() || "Parent store order",
      paymentStatus: "Pending",
      paymentMode: "",
      orderStatus: "Placed",
    });

    const populated = await CommerceOrder.findById(order._id)
      .populate("studentId", "firstName lastName studentId")
      .lean();

    return res.status(201).json({
      success: true,
      message: "Order placed. Please complete payment.",
      data: populated,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};
