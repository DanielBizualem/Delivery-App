import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { AppError } from "../utils/app-error.js";

async function resolveUser(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;

  let payload;
  try {
    payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch {
    throw new AppError("Invalid or expired token", 401);
  }

  const user = await User.findById(payload.id).select("role status");
  if (!user) throw new AppError("User not found", 401);
  if (user.status === "suspended") throw new AppError("Account suspended", 403);

  return { _id: user._id, role: user.role };
}

// requires a valid token
export async function authenticate(req, res, next) {
  try {
    const user = await resolveUser(req);
    if (!user) throw new AppError("Authentication required", 401);
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// sets req.user if a valid token is sent, continues without one
export async function optionalAuth(req, res, next) {
  try {
    req.user = (await resolveUser(req)) || undefined;
    next();
  } catch (err) {
    next(err);
  }
}

// usage: router.get("/x", authenticate, requireRole("admin"), handler)
export const requireRole =
  (...roles) =>
  (req, res, next) =>
    roles.includes(req.user?.role)
      ? next()
      : next(new AppError("You don't have permission to do this", 403));