import { Router } from "express";
import {
  create,
  pay,
  mine,
  getOne,
  confirm,
  adminList,
  availableCouriers,
  assign,
  courierMine,
} from "../../controllers/order/controller.js";
import { authenticate, requireRole } from "../../middleware/auth.js";

const router = Router();

// admin
router.get("/admin/couriers/available", authenticate, requireRole("admin"), availableCouriers);
router.get("/admin", authenticate, requireRole("admin"), adminList);
router.post("/:id/assign", authenticate, requireRole("admin"), assign);

// courier
router.get("/courier/mine", authenticate, requireRole("Courier"), courierMine);

// customer
router.post("/", authenticate, requireRole("user"), create);
router.get("/", authenticate, requireRole("user"), mine);
router.get("/:id", authenticate, requireRole("user"), getOne);
router.post("/:id/pay", authenticate, requireRole("user"), pay);
router.post("/:id/confirm-delivery", authenticate, requireRole("user"), confirm);

export default router;