import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { generateAccessToken } from "../../utils/generateToken.js";
import { generateRefreshToken } from "../../utils/generateToken.js";
import Credential from "../../models/Credential.js";
import { AppError } from "../../utils/app-error.js";
import User, {ROLES, normalizePhone} from "../../models/User.js";


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

export async function loginUser({ phone, password }) {
  if (!phone || !password) {
    throw new AppError("Phone and password are required", 400);
  }

  const user = await User.findOne({ phone: normalizePhone(phone) });
  const credential = user
    ? await Credential.findOne({ user: user._id }).select("+passwordHash")
    : null;

  const ok = await bcrypt.compare(password, credential?.passwordHash ?? DUMMY_HASH);
  if (!user || !credential || !ok) {
    throw new AppError("Invalid phone or password", 401);
  }

  if (user.status === "suspended") {
    throw new AppError("This account is suspended", 403);
  }

  return {
    user: user.toObject(),
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
  };
}

export async function refreshTokens(accessToken, refreshToken) {
  if (!accessToken || !refreshToken) {
    throw new AppError("Access token and refresh token are required", 401);
  }

  let accessPayload, refreshPayload;
  try {
    // the access token may be expired, but its signature must be valid
    accessPayload = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET, {
      ignoreExpiration: true,
    });
    refreshPayload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch {
    throw new AppError("Invalid or expired token", 401);
  }

  // both tokens must belong to the same user
  if (accessPayload.id !== refreshPayload.id) {
    throw new AppError("Invalid or expired token", 401);
  }

  const user = await User.findById(refreshPayload.id);
  if (!user || user.status === "suspended") {
    throw new AppError("Invalid or expired token", 401);
  }

  // rotate: swap the old hash for a new one in a single atomic update.
  // if the old refresh token isn't in the database (logged out or already used), nothing matches.
  const newRefreshToken = generateRefreshToken(user);
  const updated = await Credential.findOneAndUpdate(
    {
      user: user._id,
      refreshTokens: {
        $elemMatch: {
          tokenHash: sha256(refreshToken),
          expiresAt: { $gt: new Date() },
        },
      },
    },
    {
      $set: {
        "refreshTokens.$.tokenHash": sha256(newRefreshToken),
        "refreshTokens.$.expiresAt": new Date(Date.now() + REFRESH_TTL_MS),
      },
    }
  );
  if (!updated) throw new AppError("Invalid or expired token", 401);

  return {
    accessToken: generateAccessToken(user),
    refreshToken: newRefreshToken,
  };
}

// logs out this device, using the refresh cookie
export async function logoutSession(refreshToken) {
  if (!refreshToken) return;
  try {
    const { sid, id } = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    await Session.deleteOne({ _id: sid, user: id });
  } catch {
    // token already invalid or expired, nothing to delete
  }
}