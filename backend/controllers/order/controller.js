import {
  createOrder,
  payOrder,
  getMyOrders,
  getMyOrder,
  confirmDelivery,
  getAllOrders,
  getAvailableCouriers,
  assignOrder,
  getCourierOrders,
} from "../../services/order/service.js";

// what the customer sees (includes the order code once paid)
const customerView = (o) => ({
  id: o._id,
  fullName: o.fullName,
  phone: o.phone,
  deliveryAddress: o.deliveryAddress,
  startingAddress: o.startingAddress,
  material: o.material,
  estimatedMaterialCost: o.estimatedMaterialCost,
  status: o.status,
  orderCode: o.orderCode,
  payment: o.payment?.paidAt
    ? { method: o.payment.method, amount: o.payment.amount, paidAt: o.payment.paidAt }
    : undefined,
  createdAt: o.createdAt,
  assignedAt: o.assignedAt,
  deliveredAt: o.deliveredAt,
});

// what the admin sees
const adminView = (o) => ({
  id: o._id,
  customer: o.customer,
  fullName: o.fullName,
  phone: o.phone,
  deliveryAddress: o.deliveryAddress,
  startingAddress: o.startingAddress,
  material: o.material,
  estimatedMaterialCost: o.estimatedMaterialCost,
  status: o.status,
  orderCode: o.orderCode,
  payment: o.payment?.paidAt
    ? { method: o.payment.method, amount: o.payment.amount, paidAt: o.payment.paidAt }
    : undefined,
  courier: o.courier
    ? { id: o.courier._id, fullName: o.courier.fullName, phone: o.courier.phone }
    : undefined,
  createdAt: o.createdAt,
  assignedAt: o.assignedAt,
  deliveredAt: o.deliveredAt,
});

// what the courier sees (no payment, no order code)
const courierView = (o) => ({
  id: o._id,
  fullName: o.fullName,
  phone: o.phone,
  deliveryAddress: o.deliveryAddress,
  startingAddress: o.startingAddress,
  material: o.material,
  estimatedMaterialCost: o.estimatedMaterialCost,
  status: o.status,
  createdAt: o.createdAt,
  assignedAt: o.assignedAt,
  deliveredAt: o.deliveredAt,
});

/* ------------------------------ CUSTOMER ------------------------------ */

export async function create(req, res, next) {
  try {
    const order = await createOrder(req.user._id, req.body);
    res.status(201).json({
      message: "Order created, please complete the payment",
      order: customerView(order),
    });
  } catch (err) {
    next(err);
  }
}

export async function pay(req, res, next) {
  try {
    const order = await payOrder(req.user._id, req.params.id, req.body);
    res.json({
      message: "Payment successful. Keep your order code and wait for a courier",
      order: customerView(order),
    });
  } catch (err) {
    next(err);
  }
}

export async function mine(req, res, next) {
  try {
    const orders = await getMyOrders(req.user._id);
    res.json({ orders: orders.map(customerView) });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req, res, next) {
  try {
    const order = await getMyOrder(req.user._id, req.params.id);
    res.json({ order: customerView(order) });
  } catch (err) {
    next(err);
  }
}

export async function confirm(req, res, next) {
  try {
    const order = await confirmDelivery(req.user._id, req.params.id);
    res.json({ message: "Order received, thank you", order: customerView(order) });
  } catch (err) {
    next(err);
  }
}

/* -------------------------------- ADMIN -------------------------------- */

export async function adminList(req, res, next) {
  try {
    const orders = await getAllOrders({ status: req.query.status });
    res.json({ orders: orders.map(adminView) });
  } catch (err) {
    next(err);
  }
}

export async function availableCouriers(req, res, next) {
  try {
    const slots = await getAvailableCouriers();
    res.json({
      couriers: slots.map((s, i) => ({
        position: i + 1, // 1 = has waited the longest
        id: s.courier._id,
        fullName: s.courier.fullName,
        phone: s.courier.phone,
        availableSince: s.availableSince,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function assign(req, res, next) {
  try {
    const order = await assignOrder(req.user._id, req.params.id, req.body?.courierId);
    res.json({ message: "Order assigned to courier", order: adminView(order) });
  } catch (err) {
    next(err);
  }
}

/* ------------------------------- COURIER ------------------------------- */

export async function courierMine(req, res, next) {
  try {
    const orders = await getCourierOrders(req.user._id);
    res.json({ orders: orders.map(courierView) });
  } catch (err) {
    next(err);
  }
}