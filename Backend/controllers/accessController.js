import Access from "../models/access.js";

/* ---------------- CREATE ACCESS ---------------- */

export const createAccess = async (req,res,next)=>{
  try{

    const {role,permissions} = req.body;

    const access = await Access.create({
      role,
      permissions
    });

    res.status(201).json({
      success:true,
      message:"Access created successfully",
      data:access
    });

  }catch(error){
    next(error);
  }
};


/* ---------------- GET ACCESS ---------------- */

export const getAccess = async (req,res,next)=>{
  try{

    const access = await Access.find()
      .populate("role","name")
      .sort({createdAt:-1});

    res.json({
      success:true,
      data:access
    });

  }catch(error){
    next(error);
  }
};


/* ---------------- UPDATE ACCESS ---------------- */

export const updateAccess = async (req,res,next)=>{
  try{

    const {role,permissions} = req.body;

    const access = await Access.findByIdAndUpdate(
      req.params.id,
      {role,permissions},
      {new:true}
    );

    res.json({
      success:true,
      message:"Access updated successfully",
      data:access
    });

  }catch(error){
    next(error);
  }
};


/* ---------------- DELETE ACCESS ---------------- */

export const deleteAccess = async (req,res,next)=>{
  try{

    await Access.findByIdAndDelete(req.params.id);

    res.json({
      success:true,
      message:"Access deleted successfully"
    });

  }catch(error){
    next(error);
  }
};