import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import CourierAvailability from "../../models/CourierAvailability.js";
import Credential from "../../models/Credential.js";
import User, { ROLES, normalizePhone } from "../../models/User.js";
import { AppError } from "../../utils/app-error.js";
import {
  generateAccessToken,
  generateRefreshToken,getTokenExpiry,
  sha256,
} from "../../utils/generateToken.js";

const SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;
const MAX_DEVICES = 5;

// compared against when the phone isn't found, so timing doesn't reveal which phones exist
const DUMMY_HASH = bcrypt.hashSync("dummy-password", SALT_ROUNDS);

/* ---------------------------- REGISTER ---------------------------- */

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

      if (role === "Courier") {
        await CourierAvailability.create([{ courier: createdUser._id }], { session });
      }
      
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

/* ------------------------------ LOGIN ----------------------------- */

async function storeRefreshToken(userId, token) {
  // drop expired entries first (one update can't $pull and $push the same field)
  await Credential.updateOne(
    { user: userId },
    { $pull: { refreshTokens: { expiresAt: { $lt: new Date() } } } }
  );

  // add this device's token, keeping only the newest MAX_DEVICES entries
  await Credential.updateOne(
    { user: userId },
    {
      $push: {
        refreshTokens: {
          $each: [
            {
              tokenHash: sha256(token),
              expiresAt: getTokenExpiry(token),
            },
          ],
          $slice: -MAX_DEVICES,
        },
      },
    }
  );
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

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  await storeRefreshToken(user._id, refreshToken);

  return { user: user.toObject(), accessToken, refreshToken };
}

/* ----------------------------- REFRESH ---------------------------- */

// userId comes from the authenticate middleware (valid access token)
export async function refreshTokens(refreshToken) {
  const fail = (reason) => {
    console.log("refresh failed:", reason); // server log only, remove later
    throw new AppError("Invalid or expired token", 401);
  };

  if (!refreshToken) fail("no refresh cookie");

  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch {
    fail("refresh token invalid or expired");
  }

  const user = await User.findById(payload.id);
  if (!user || user.status === "suspended") fail("user missing or suspended");

  // rotate: swap the old hash for a new one in a single atomic update.
  // if the old token isn't in the database (logged out or already used), nothing matches.
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
        "refreshTokens.$.expiresAt": getTokenExpiry(newRefreshToken),
      },
    }
  );
  if (!updated) fail("refresh token not found in database");

  return {
    accessToken: generateAccessToken(user),
    refreshToken: newRefreshToken,
  };
}

/* ------------------------------ LOGOUT ---------------------------- */

// logs out this device, using the refresh cookie
export async function logoutSession(refreshToken) {
  if (!refreshToken) return;
  const hash = sha256(refreshToken);
  await Credential.updateOne(
    { "refreshTokens.tokenHash": hash },
    { $pull: { refreshTokens: { tokenHash: hash } } }
  );
}

// logs out all devices
export async function logoutAllSessions(userId) {
  await Credential.updateOne({ user: userId }, { $set: { refreshTokens: [] } });
}