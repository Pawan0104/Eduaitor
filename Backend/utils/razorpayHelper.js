import Razorpay from "razorpay";
import School from "../models/school.js";

export const hasRealRazorpayKeys = (school) => {
  const keyId = String(school?.razorpayKeyId || "").trim();
  const secret = String(school?.razorpayKeySecret || "").trim();
  if (!keyId || !secret) return false;
  if (keyId === "rzp_test_local" || keyId.startsWith("rzp_test_eduaitor")) {
    return false;
  }
  return /^rzp_(test|live)_[A-Za-z0-9]+$/.test(keyId);
};

export const getSchoolRazorpay = async (schoolId) => {
  const school = await School.findById(schoolId)
    .select("razorpayKeyId razorpayKeySecret school_name")
    .lean();
  return school;
};

export const createRazorpayOrderForSchool = async ({
  school,
  amountRupees,
  receipt,
  notes = {},
}) => {
  const amount = Number(amountRupees);
  if (!amount || amount <= 0) {
    throw new Error("A valid amount is required");
  }

  if (!hasRealRazorpayKeys(school)) {
    return {
      mock: true,
      orderId: `order_local_${Date.now()}`,
      amount: Math.round(amount * 100),
      currency: "INR",
      key_id: "rzp_test_dev",
      amountRupees: amount,
    };
  }

  const razorpay = new Razorpay({
    key_id: school.razorpayKeyId,
    key_secret: school.razorpayKeySecret,
  });

  const order = await razorpay.orders.create({
    amount: Math.round(amount * 100),
    currency: "INR",
    receipt: String(receipt || `rcpt_${Date.now()}`).slice(0, 40),
    payment_capture: 1,
    notes,
  });

  return {
    mock: false,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    key_id: school.razorpayKeyId,
    amountRupees: amount,
  };
};

export const verifyRazorpaySignatureForSchool = async ({
  school,
  orderId,
  paymentId,
  signature,
}) => {
  const isDevOrder = String(orderId).startsWith("order_local_");

  if (isDevOrder) {
    return signature === "local_test_signature";
  }

  if (!hasRealRazorpayKeys(school)) {
    return false;
  }

  const { validatePaymentVerification } = await import(
    "razorpay/dist/utils/razorpay-utils.js"
  );

  return validatePaymentVerification(
    { order_id: orderId, payment_id: paymentId },
    signature,
    school.razorpayKeySecret
  );
};
