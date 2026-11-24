import crypto from "crypto";
import mongoose from "mongoose";
import Order, { ORDER_STATUS } from "../../models/Order.js";
import User from "../../models/User.js";
import CourierAvailability from "../../models/CourierAvailability.js";
import { AppError } from "../../utils/app-error.js";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no I, L, O, 0, 1
const CODE_LENGTH = 6;

const generateOrderCode = () =>
  Array.from(
    { length: CODE_LENGTH },
    () => CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]
  ).join("");

const assertId = (id) => {
  if (!mongoose.isValidObjectId(id)) throw new AppError("Order not found", 404);
};

// connect your payment gateway here (Chapa, Telebirr, ...):
// confirm the reference exists, was successful, and the amount matches
async function verifyPayment({ method, reference, amount }) {
  if (!method || !reference) {
    throw new AppError("Payment method and reference are required", 400);
  }
  if (process.env.NODE_ENV === "production") {
    throw new AppError("Payment gateway is not connected", 501);
  }
  // development only: any reference is accepted
}

/* ------------------------------ CUSTOMER ------------------------------ */

export async function createOrder(customerId, input) {
  const {
    fullName,
    phone,
    deliveryAddress,
    startingAddress,
    material,
    estimatedMaterialCost,
  } = input;

  try {
    const order = await Order.create({
      customer: customerId,
      fullName,
      phone,
      deliveryAddress,
      startingAddress,
      material,
      estimatedMaterialCost,
    });
    return order.toObject();
  } catch (err) {
    if (err.name === "ValidationError") {
      const details = Object.fromEntries(
        Object.entries(err.errors).map(([k, v]) => [k, v.message])
      );
      throw new AppError("Validation failed", 400, details);
    }
    throw err;
  }
}

export async function payOrder(customerId, orderId, { method, reference } = {}) {
  assertId(orderId);

  const order = await Order.findOne({ _id: orderId, customer: customerId });
  if (!order) throw new AppError("Order not found", 404);
  if (order.status !== "pending_payment") {
    throw new AppError("This order is already paid", 409);
  }

  const amount = order.estimatedMaterialCost;
  await verifyPayment({ method, reference, amount });

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      // the status condition makes this safe against double payment
      const paid = await Order.findOneAndUpdate(
        { _id: orderId, customer: customerId, status: "pending_payment" },
        {
          $set: {
            status: "waiting_courier",
            orderCode: generateOrderCode(),
            payment: { method, reference, amount, paidAt: new Date() },
          },
        },
        { new: true }
      );

      if (!paid) throw new AppError("This order is already paid", 409);
      return paid.toObject();
    } catch (err) {
      if (err.code === 11000) {
        if (err.keyPattern?.["payment.reference"]) {
          throw new AppError("This payment reference was already used", 409);
        }
        continue; // order code collision, generate another
      }
      throw err;
    }
  }
  throw new AppError("Could not generate an order code, please try again", 500);
}

export async function getMyOrders(customerId) {
  return Order.find({ customer: customerId }).sort({ createdAt: -1 }).lean();
}

export async function getMyOrder(customerId, orderId) {
  assertId(orderId);
  const order = await Order.findOne({ _id: orderId, customer: customerId }).lean();
  if (!order) throw new AppError("Order not found", 404);
  return order;
}

// the customer confirms receipt: the order is delivered and the courier
// joins the end of the available list
export async function confirmDelivery(customerId, orderId) {
  assertId(orderId);

  const session = await mongoose.startSession();
  try {
    let delivered;

    await session.withTransaction(async () => {
      const order = await Order.findOneAndUpdate(
        { _id: orderId, customer: customerId, status: "assigned" },
        { $set: { status: "delivered", deliveredAt: new Date() } },
        { new: true, session }
      );
      if (!order) {
        throw new AppError("Order not found or not assigned to a courier yet", 409);
      }

      await CourierAvailability.updateOne(
        { courier: order.courier },
        { $setOnInsert: { availableSince: new Date() } },
        { upsert: true, session }
      );

      delivered = order;
    });

    return delivered.toObject();
  } finally {
    await session.endSession();
  }
}

/* -------------------------------- ADMIN -------------------------------- */

const ADMIN_FIELDS =
  "customer courier fullName phone deliveryAddress startingAddress material estimatedMaterialCost status orderCode payment assignedAt deliveredAt createdAt";

// optional status filter, e.g. "waiting_courier" for orders that need a courier
export async function getAllOrders({ status } = {}) {
  const filter = ORDER_STATUS.includes(status) ? { status } : {};
  return Order.find(filter)
    .select(ADMIN_FIELDS)
    .populate("courier", "fullName phone")
    .sort({ createdAt: -1 })
    .lean();
}

// first come first served: the courier who has been available longest is first
export async function getAvailableCouriers() {
  const slots = await CourierAvailability.find()
    .sort({ availableSince: 1, _id: 1 })
    .populate({
      path: "courier",
      select: "fullName phone",
      match: { status: { $ne: "suspended" } },
    })
    .lean();

  return slots.filter((s) => s.courier);
}

// the admin may pick any available courier; being assigned removes them from the list
export async function assignOrder(adminId, orderId, courierId) {
  assertId(orderId);
  if (!mongoose.isValidObjectId(courierId)) {
    throw new AppError("Courier not found", 404);
  }

  const courier = await User.findOne({ _id: courierId, role: "Courier" }).select("status");
  if (!courier) throw new AppError("Courier not found", 404);
  if (courier.status === "suspended") {
    throw new AppError("This courier account is suspended", 409);
  }

  const session = await mongoose.startSession();
  try {
    let assigned;

    await session.withTransaction(async () => {
      const slot = await CourierAvailability.findOneAndDelete(
        { courier: courierId },
        { session }
      );
      if (!slot) throw new AppError("This courier is not available", 409);

      const order = await Order.findOneAndUpdate(
        { _id: orderId, status: "waiting_courier" },
        {
          $set: {
            status: "assigned",
            courier: courierId,
            assignedBy: adminId,
            assignedAt: new Date(),
          },
        },
        { new: true, session }
      )
        .select(ADMIN_FIELDS)
        .populate("courier", "fullName phone");

      if (!order) {
        throw new AppError(
          "Order can't be assigned (not found, unpaid, or already assigned)",
          409
        );
      }

      assigned = order;
    });

    return assigned.toObject();
  } finally {
    await session.endSession();
  }
}

/* ------------------------------- COURIER ------------------------------- */

const COURIER_FIELDS =
  "fullName phone deliveryAddress startingAddress material estimatedMaterialCost status assignedAt deliveredAt createdAt";

// only the orders an admin assigned to this courier
export async function getCourierOrders(courierId) {
  return Order.find({ courier: courierId })
    .select(COURIER_FIELDS)
    .sort({ assignedAt: -1 })
    .lean();
}