import { Router } from "express";
import {
  register,
  registerCourier,
  login,
  refresh,
  logout,
  logoutAll,
} from "../../controllers/auth/controller.js";
import { authenticate, requireRole } from "../../middleware/auth.js";

const router = Router();

router.post("/register", register);                                              // anyone, always role "user"
router.post("/register-courier", authenticate, requireRole("admin"), registerCourier); // admin only
router.post("/login", login);
router.post("/refresh", refresh); // no authenticate: the access token is expired by then
router.post("/logout", logout);
router.post("/logout-all", authenticate, logoutAll);

export default router;