import { Router } from "express";
import { register } from "../../controllers/auth/controller.js";

// import { optionalAuth } from "../middleware/auth.js";

const router = Router();

// optionalAuth should set req.user if a valid token is present, but not fail without one
router.post("/register", /* optionalAuth, */ register);

export default router;