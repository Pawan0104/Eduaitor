import School from "../models/school.js";
import bcrypt from "bcryptjs";
import Razorpay from "razorpay";
import {MODULE_KEYS,DEFAULT_MODULES} from "../constants/module.js";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";
import { ensureDefaultHouses } from "../utils/ensureDefaultHouses.js";

const isMockRazorpayKey = (keyId = "") =>
  keyId === "rzp_test_local" || keyId.startsWith("rzp_test_eduaitor");

const isValidRazorpayKeyId = (keyId = "") =>
  /^rzp_(test|live)_[A-Za-z0-9]+$/.test(String(keyId).trim());

/* ---------------- CREATE SCHOOL ---------------- */

export const createSchool = async (req, res, next) => {
  try {
    const {
      school_name,
      slug,
      subscription_plan,
      start_date,
      end_date,
      address,
      contact_email,
      contact_phone,
      admin_name,
      admin_email,
      admin_password,
      status,
      subscribed_modules,
    } = req.body;

    // ── 1. PARSE MODULES ──────────────────────────────
    let modules = [];

    if (subscribed_modules) {
      try {
        modules = JSON.parse(subscribed_modules);
      } catch {
        return res.status(400).json({
          success: false,
          message: "Invalid modules format. Must be a JSON array.",
        });
      }
    }

    // fallback to defaults if nothing selected
    if (!Array.isArray(modules) || modules.length === 0) {
      modules = DEFAULT_MODULES;
    }

    // ── 2. VALIDATE MODULES ───────────────────────────
    const invalidModules = modules.filter((m) => !MODULE_KEYS.includes(m));
    if (invalidModules.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid module(s): ${invalidModules.join(", ")}`,
      });
    }

    // ── 3. UPLOAD LOGO TO CLOUDINARY ──────────────────
    let school_logo = null;
    if (req.file) {
      const uploaded = await uploadToCloudinary(req.file, "schools");
      school_logo = uploaded.url;
    }

    // ── 4. HASH PASSWORD ──────────────────────────────
    const hashedPassword = await bcrypt.hash(admin_password, 10);

    // ── 5. CREATE SCHOOL ──────────────────────────────
    const school = await School.create({
      school_name,
      slug,
      subscription_plan: subscription_plan || null,
      start_date: start_date || null,
      end_date: end_date || null,
      address,
      contact_email,
      contact_phone,
      admin_name,
      admin_email,
      admin_password: hashedPassword,
      temp_password: admin_password,
      status: status || "Active",
      school_logo,
      subscribed_modules: modules,
      razorpayKeyId: razorpayKeyId || "",
      razorpayKeySecret: razorpayKeySecret || "",
    });

    if (modules.includes("house")) {
      await ensureDefaultHouses(school._id);
    }

    return res.status(201).json({
      success: true,
      message: "School created successfully",
      data: school,
    });

  } catch (error) {
    next(error);
  }
};

/* ---------------- GET ALL SCHOOLS ---------------- */

export const getSchools = async (req, res, next) => {
  try {
    const schools = await School.find()
      .populate("subscription_plan")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: schools,
    });
  } catch (error) {
    next(error);
  }
};

/* ---------------- GET SINGLE SCHOOL ---------------- */

export const getSchool = async (req, res, next) => {
  try {
    const school = await School.findById(req.params.id).populate({
      path: "subscription_plan",
      populate: {
        path: "roles",
        select: "name", // Optional: only fetch the name field
      },
    });

    res.json({
      success: true,
      data: school,
    });
  } catch (error) {
    next(error);
  }
};

/* ---------------- UPDATE SCHOOL ---------------- */

/* ---------------- UPDATE SCHOOL ---------------- */

export const updateSchool = async (req, res, next) => {
  try {
    const {
      school_name,
      slug,
      subscription_plan,
      start_date,
      end_date,
      address,
      contact_email,
      contact_phone,
      admin_name,
      admin_email,
      admin_password,
      status,
      subscribed_modules,
      razorpayKeyId,
      razorpayKeySecret,
    } = req.body;

    // ── 1. BUILD UPDATE OBJECT ────────────────────────
    const updateData = {};

    if (school_name)      updateData.school_name      = school_name;
    if (slug)             updateData.slug             = slug;
    if (subscription_plan) updateData.subscription_plan = subscription_plan;
    if (start_date)       updateData.start_date       = start_date;
    if (end_date)         updateData.end_date         = end_date;
    if (address)          updateData.address          = address;
    if (contact_email)    updateData.contact_email    = contact_email;
    if (contact_phone)    updateData.contact_phone    = contact_phone;
    if (admin_name)       updateData.admin_name       = admin_name;
    if (admin_email)      updateData.admin_email      = admin_email;
    if (status)           updateData.status           = status;
    if (razorpayKeyId !== undefined)     updateData.razorpayKeyId     = razorpayKeyId;
    if (razorpayKeySecret !== undefined) updateData.razorpayKeySecret = razorpayKeySecret;

    // ── 2. HANDLE PASSWORD ────────────────────────────
    if (admin_password) {
      updateData.temp_password  = admin_password;
      updateData.admin_password = await bcrypt.hash(admin_password, 10);
    }

    // ── 3. HANDLE LOGO ────────────────────────────────
    if (req.file) {
      const uploaded = await uploadToCloudinary(req.file, "schools");
      updateData.school_logo = uploaded.url;
    }

    // ── 4. HANDLE MODULES ─────────────────────────────
    if (subscribed_modules) {
      let modules = [];

      try {
        modules = JSON.parse(subscribed_modules);
      } catch {
        return res.status(400).json({
          success: false,
          message: "Invalid modules format. Must be a JSON array.",
        });
      }

      if (!Array.isArray(modules) || modules.length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one module must be selected.",
        });
      }

      const invalidModules = modules.filter((m) => !MODULE_KEYS.includes(m));
      if (invalidModules.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid module(s): ${invalidModules.join(", ")}`,
        });
      }

      updateData.subscribed_modules = modules;
    }

    // ── 5. NOTHING TO UPDATE ──────────────────────────
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields provided to update.",
      });
    }

    // ── 6. UPDATE ─────────────────────────────────────
    const school = await School.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!school) {
      return res.status(404).json({
        success: false,
        message: "School not found.",
      });
    }

    if (school.subscribed_modules?.includes("house")) {
      await ensureDefaultHouses(school._id);
    }

    return res.json({
      success: true,
      message: "School updated successfully",
      data: school,
    });

  } catch (error) {
    next(error);
  }
};

/* ---------------- DELETE SCHOOL ---------------- */

export const deleteSchool = async (req, res, next) => {
  try {
    await School.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "School deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/* ---------------- SCHOOL SELF-SERVE RAZORPAY SETTINGS ---------------- */

export const getMySchoolRazorpay = async (req, res, next) => {
  try {
    const schoolId = req.user?.school_id;
    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: "School context required",
      });
    }

    const school = await School.findById(schoolId).select("razorpayKeyId razorpayKeySecret");
    if (!school) {
      return res.status(404).json({
        success: false,
        message: "School not found",
      });
    }

    res.json({
      success: true,
      data: {
        razorpayKeyId: school.razorpayKeyId || "",
        hasSecret: !!school.razorpayKeySecret,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateMySchoolRazorpay = async (req, res, next) => {
  try {
    const schoolId = req.user?.school_id;
    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: "School context required",
      });
    }

    const { razorpayKeyId, razorpayKeySecret } = req.body;
    const keyId = razorpayKeyId !== undefined ? String(razorpayKeyId).trim() : undefined;

    if (keyId !== undefined) {
      if (!keyId) {
        return res.status(400).json({
          success: false,
          message: "Razorpay Key ID is required",
        });
      }
      if (isMockRazorpayKey(keyId) || !isValidRazorpayKeyId(keyId)) {
        return res.status(400).json({
          success: false,
          message:
            "Enter a valid Razorpay Key ID from the dashboard (starts with rzp_test_ or rzp_live_).",
        });
      }
    }

    const updateData = {};
    if (keyId !== undefined) updateData.razorpayKeyId = keyId;
    if (razorpayKeySecret !== undefined && razorpayKeySecret !== "") {
      updateData.razorpayKeySecret = String(razorpayKeySecret).trim();
    }

    const school = await School.findByIdAndUpdate(
      schoolId,
      { $set: updateData },
      { returnDocument: "after", runValidators: true },
    );

    res.json({
      success: true,
      message: "Razorpay credentials updated successfully",
      data: {
        razorpayKeyId: school.razorpayKeyId || "",
        hasSecret: !!school.razorpayKeySecret,
        mode: String(school.razorpayKeyId || "").startsWith("rzp_live_")
          ? "live"
          : "test",
      },
    });
  } catch (error) {
    next(error);
  }
};

export const testMySchoolRazorpay = async (req, res, next) => {
  try {
    const schoolId = req.user?.school_id;
    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: "School context required",
      });
    }

    const school = await School.findById(schoolId).select(
      "razorpayKeyId razorpayKeySecret school_name",
    );
    if (!school) {
      return res.status(404).json({
        success: false,
        message: "School not found",
      });
    }

    if (!school.razorpayKeyId || !school.razorpayKeySecret) {
      return res.status(400).json({
        success: false,
        message: "Save Razorpay Key ID and Secret first.",
      });
    }

    if (
      isMockRazorpayKey(school.razorpayKeyId) ||
      !isValidRazorpayKeyId(school.razorpayKeyId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Current Key ID is invalid. Paste real keys from Razorpay Dashboard.",
      });
    }

    const razorpay = new Razorpay({
      key_id: school.razorpayKeyId,
      key_secret: school.razorpayKeySecret,
    });

    // Tiny order proves both key + secret are accepted by Razorpay
    const order = await razorpay.orders.create({
      amount: 100, // ₹1 in paise
      currency: "INR",
      receipt: `keytest_${Date.now()}`.slice(0, 40),
      notes: { purpose: "razorpay_key_setup_test" },
    });

    res.json({
      success: true,
      message: "Razorpay keys are working. Checkout is ready for parents.",
      data: {
        razorpayKeyId: school.razorpayKeyId,
        mode: school.razorpayKeyId.startsWith("rzp_live_") ? "live" : "test",
        testOrderId: order.id,
        amount: order.amount,
        currency: order.currency,
      },
    });
  } catch (error) {
    console.error("Razorpay key test failed:", error);
    return res.status(400).json({
      success: false,
      message:
        error?.error?.description ||
        error?.message ||
        "Razorpay rejected these keys. Check Key ID and Secret.",
    });
  }
};
