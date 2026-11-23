import { Router } from "express";
import { login, logout, refresh, register } from "../../controllers/auth/controller.js";

// import { optionalAuth } from "../middleware/auth.js";
import { protect } from "../../middleware/auth.js";

const router = Router();

// optionalAuth should set req.user if a valid token is present, but not fail without one
router.post("/register", /* optionalAuth, */ register);
router.post("/login",login)
router.post("/logout", logout)
router.post("/refresh", refresh)

export default router;