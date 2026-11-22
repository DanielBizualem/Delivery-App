import { registerUser } from "../../services/auth/service.js";
import { AppError } from "../../utils/app-error.js";

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

