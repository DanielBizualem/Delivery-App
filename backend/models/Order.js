import mongoose from "mongoose";
import { normalizePhone } from "./User.js";

const PHONE_REGEX = /^\+?[0-9]{9,15}$/;

export const ORDER_STATUS = [
  "pending_payment",
  "waiting_courier",
  "assigned",
  "delivered",
];

const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // the entries the customer fills in
    fullName: { type: String, required: [true, "Full name is required"], trim: true },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      set: normalizePhone,
      match: [PHONE_REGEX, "Invalid phone number"],
    },
    deliveryAddress: {
      type: String,
      required: [true, "Delivery address is required"],
      trim: true,
    },
    startingAddress: {
      type: String,
      required: [true, "Starting address is required"],
      trim: true,
    },
    material: { type: String, required: [true, "Material is required"], trim: true },
    estimatedMaterialCost: {
      type: Number,
      required: [true, "Estimated cost of material is required"],
      min: [0, "Estimated cost cannot be negative"],
    },

    status: {
      type: String,
      enum: ORDER_STATUS,
      default: "pending_payment",
      index: true,
    },

    payment: {
      method: String,
      reference: String,
      amount: Number,
      paidAt: Date,
    },

    // issued after payment, used as the order reference
    orderCode: { type: String, unique: true, sparse: true },

    // set by an admin
    courier: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedAt: Date,

    // set when the customer confirms receipt
    deliveredAt: Date,
  },
  { timestamps: true }
);

// one payment reference can pay for only one order
orderSchema.index({ "payment.reference": 1 }, { unique: true, sparse: true });

export default mongoose.model("Order", orderSchema);