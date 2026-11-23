import mongoose from "mongoose";

export const ROLES = ["admin", "Courier", "user"];

// remove spaces, dashes, brackets: "+251 91-123 (4567)" -> "+251911234567"
export const normalizePhone = (v) => (v ? v.replace(/[\s\-()]/g, "") : v);
const PHONE_REGEX = /^\+?[0-9]{9,15}$/;

const parentSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: {
      type: String,
      required: true,
      set: normalizePhone,
      match: [PHONE_REGEX, "Invalid parent phone number"],
    },
    relationship: {
      type: String,
      enum: ["father", "mother", "guardian", "other"],
      default: "guardian",
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: {
      type: String,
      required: true,
      unique: true,
      set: normalizePhone,
      match: [PHONE_REGEX, "Invalid phone number"],
    },

    // optional; "" is converted to undefined so the sparse index ignores it
    email: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true,
      sparse: true,
      set: (v) => (v ? v : undefined),
      match: [/^\S+@\S+\.\S+$/, "Invalid email address"],
    },

    role: {
      type: String,
      enum: ROLES,
      required: true,
      index: true,
    },

    // optional, only for users who have a parent/guardian on record
    parent: { type: parentSchema },

    status: {
      type: String,
      enum: ["active", "suspended", "pending"],
      default: "pending",
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);