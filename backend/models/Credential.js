import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// the only place that decides how passwords are hashed
const SALT_ROUNDS = 12;
const DUMMY_HASH = bcrypt.hashSync("dummy-password", SALT_ROUNDS);

const credentialSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one credential per user
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // never returned unless explicitly requested
    },

    // one entry per logged-in device; only hashes are stored, never the token itself
    refreshTokens: {
      type: [
        {
          _id: false,
          tokenHash: { type: String, required: true },
          expiresAt: { type: Date, required: true },
        },
      ],
      default: [],
      select: false,
    },

    passwordChangedAt: { type: Date },
    failedAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

credentialSchema.statics.hashPassword = (plain) => bcrypt.hash(plain, SALT_ROUNDS);

// does the same work as a real check, for when the phone doesn't exist
credentialSchema.statics.fakeCompare = (plain) => bcrypt.compare(plain, DUMMY_HASH);

credentialSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

credentialSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

export default mongoose.model("Credential", credentialSchema);