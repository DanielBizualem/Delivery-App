import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import Credential from "../../models/Credential.js";
import { AppError } from "../../utils/app-error.js";
import User, {ROLES} from "../../models/User.js";


const SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;

export async function registerUser(input, { createdBy } = {}) {
  const { fullName, phone, email, role, parent, password } = input;

  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw new AppError(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      400
    );
  }
  if (!ROLES.includes(role)) {
    throw new AppError(`Role must be one of: ${ROLES.join(", ")}`, 400);
  }

  // hash outside the transaction so it doesn't hold the transaction open
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const session = await mongoose.startSession();
  try {
    let user;

    await session.withTransaction(async () => {
      const [createdUser] = await User.create(
        [{ fullName, phone, email, role, parent, createdBy }],
        { session }
      );

      await Credential.create([{ user: createdUser._id, passwordHash }], {
        session,
      });

      user = createdUser;
    });

    return user.toObject();
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || "field";
      throw new AppError(`A user with this ${field} already exists`, 409);
    }
    if (err.name === "ValidationError") {
      const details = Object.fromEntries(
        Object.entries(err.errors).map(([k, v]) => [k, v.message])
      );
      throw new AppError("Validation failed", 400, details);
    }
    throw err;
  } finally {
    await session.endSession();
  }
}