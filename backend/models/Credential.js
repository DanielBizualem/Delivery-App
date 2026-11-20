import mongoose from "mongoose";
import bcrypt from "bcryptjs";

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

    passwordChangedAt: { type: Date },

    failedAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

credentialSchema.statics.hashPassword = (plain) => bcrypt.hash(plain, 12);

credentialSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

credentialSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

export default mongoose.model("Credential", credentialSchema);