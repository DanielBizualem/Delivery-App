import { Router } from "express";
import {
  register,
  login,
  refresh,
  logout,
  logoutAll,
} from "../../controllers/auth/controller.js";
import { authenticate, optionalAuth } from "../../middleware/auth.js";

const router = Router();

// optionalAuth sets req.user when a valid token is sent, but doesn't fail without one,
// so anyone can register as "user" and only a logged-in admin can create admin/Courier
router.post("/register", optionalAuth, register);
router.post("/login", login);
router.post("/refresh", refresh); // no authenticate: the access token is expired by then
router.post("/logout", logout);
router.post("/logout-all", authenticate, logoutAll);

export default router;