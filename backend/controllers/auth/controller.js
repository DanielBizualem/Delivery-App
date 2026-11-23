import {
  registerUser,
  loginUser,
  refreshTokens,
  logoutSession,
  logoutAllSessions,
} from "../../services/auth/service.js";
import { AppError } from "../../utils/app-error.js";
import { refreshCookie, clearCookie } from "../../utils/generateToken.js";

const PRIVILEGED_ROLES = ["admin", "Courier"];

export async function register(req, res, next) {
  try {
    const { fullName, phone, email, role = "user", parent, password } = req.body;

    if (!fullName || !phone) {
      throw new AppError("fullName and phone are required", 400);
    }

    // only a logged-in admin may create admin/Courier accounts
    if (PRIVILEGED_ROLES.includes(role) && req.user?.role !== "admin") {
      throw new AppError("Not allowed to register this role", 403);
    }

    const user = await registerUser(
      { fullName, phone, email, role, parent, password },
      { createdBy: req.user?._id }
    );

    res.status(201).json({
      message: "Registration successful",
      user: {
        id: user._id,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        role: user.role,
        parent: user.parent,
        status: user.status,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { phone, password } = req.body;
    const { user, accessToken, refreshToken } = await loginUser({ phone, password });

    res.cookie("refreshToken", refreshToken, refreshCookie);
    res.json({
      message: "Login successful",
      accessToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const tokens = await refreshTokens(req.cookies?.refreshToken);

    res.cookie("refreshToken", tokens.refreshToken, refreshCookie);
    res.json({ accessToken: tokens.accessToken });
  } catch (err) {
    res.clearCookie("refreshToken", clearCookie);
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    await logoutSession(req.cookies?.refreshToken);
    res.clearCookie("refreshToken", clearCookie);
    res.json({ message: "Logged out" });
  } catch (err) {
    next(err);
  }
}

export async function logoutAll(req, res, next) {
  try {
    await logoutAllSessions(req.user._id);
    res.clearCookie("refreshToken", clearCookie);
    res.json({ message: "Logged out from all devices" });
  } catch (err) {
    next(err);
  }
}