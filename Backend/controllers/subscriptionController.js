import Subscription from "../models/subscription.js";


/* ---------------- CREATE ---------------- */

export const createSubscription = async(req,res,next)=>{
  try{

    const subscription = await Subscription.create(req.body);

    res.status(201).json({
      success:true,
      message:"Subscription created successfully",
      data:subscription
    });

  }catch(error){
    next(error);
  }
};


/* ---------------- GET ALL ---------------- */

export const getSubscriptions = async(req,res,next)=>{
  try{

    const subscriptions = await Subscription.find()
      .populate("roles","name")
      .sort({createdAt:-1});

    res.json({
      success:true,
      data:subscriptions
    });

  }catch(error){
    next(error);
  }
};


/* ---------------- GET ONE ---------------- */

export const getSubscription = async(req,res,next)=>{
  try{

    const subscription = await Subscription.findById(req.params.id)
      .populate("roles","name");

    res.json({
      success:true,
      data:subscription
    });

  }catch(error){
    next(error);
  }
};


/* ---------------- UPDATE ---------------- */

export const updateSubscription = async(req,res,next)=>{
  try{

    const subscription = await Subscription.findByIdAndUpdate(
      req.params.id,
      req.body,
      {new:true}
    );

    res.json({
      success:true,
      message:"Subscription updated successfully",
      data:subscription
    });

  }catch(error){
    next(error);
  }
};


/* ---------------- DELETE ---------------- */

export const deleteSubscription = async(req,res,next)=>{
  try{

    await Subscription.findByIdAndDelete(req.params.id);

    res.json({
      success:true,
      message:"Subscription deleted successfully"
    });

  }catch(error){
    next(error);
  }
};