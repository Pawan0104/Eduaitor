import Role from "../models/role.js";

export const createRole = async (req, res, next) => {
  try {

    const { name } = req.body;

    const role = await Role.create({ name });

    res.status(201).json({
      success: true,
      message: "Role created successfully",
      data: role
    });

  } catch (error) {
    next(error);
  }
};

export const getRoles = async (req, res, next) => {
  try {

    const roles = await Role.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      data: roles
    });

  } catch (error) {
    next(error);
  }
};

export const updateRole = async (req, res, next) => {
  try {

    const role = await Role.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json({
      success: true,
      message: "Role updated successfully",
      data: role
    });

  } catch (error) {
    next(error);
  }
};

export const deleteRole = async (req, res, next) => {
  try {

    await Role.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Role deleted successfully"
    });

  } catch (error) {
    next(error);
  }
};