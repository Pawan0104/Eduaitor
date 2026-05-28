import School from "../models/school.js";
import bcrypt from "bcryptjs";

/* ---------------- CREATE SCHOOL ---------------- */

export const createSchool = async (req, res, next) => {
  try {
    let pass = req.body.admin_password;
    let hashedPassword = await bcrypt.hash(pass, 10);
    req.body.admin_password = hashedPassword;
    req.body.temp_password = pass;
    const school = await School.create(req.body);

    res.status(201).json({
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

export const updateSchool = async (req, res, next) => {
  try {
    const updateData = { ...req.body };

    if (updateData.admin_password) {
      updateData.temp_password = updateData.admin_password;
      updateData.admin_password = await bcrypt.hash(updateData.admin_password, 10);
    } else {
      delete updateData.admin_password;
      delete updateData.temp_password;
    }

    const school = await School.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });

    res.json({
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
