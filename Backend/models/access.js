import mongoose from "mongoose";

const permissionSchema = new mongoose.Schema(
{
  view: { type: Boolean, default: false },
  create: { type: Boolean, default: false },
  edit: { type: Boolean, default: false },
  delete: { type: Boolean, default: false }
},
{ _id:false }
);

const accessSchema = new mongoose.Schema({

  role:{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Role",
    required:true
  },

  permissions:{
    type: Map,
    of: permissionSchema,
    default:{}
  }

},{timestamps:true});

export default mongoose.model("Access", accessSchema);