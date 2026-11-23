import crypto from "crypto";
import jwt from "jsonwebtoken";

// lifetimes are defined once, here (in seconds)
const ACCESS_TTL_SECONDS = 15 * 60;              // 15 minutes
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;    // 7 days

export const sha256 = (data) =>
  crypto.createHash("sha256").update(data).digest("hex");

export const generateAccessToken = (user) => {
  return jwt.sign({ id: user.id }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TTL_SECONDS,
  });
};

export const generateRefreshToken = (user) => {
  return jwt.sign({ id: user.id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TTL_SECONDS,
    jwtid: crypto.randomUUID(), // unique per rotation
  });
};

// when a token expires, read from the token itself
export const getTokenExpiry = (token) => new Date(jwt.decode(token).exp * 1000);

export const refreshCookie = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: REFRESH_TTL_SECONDS * 1000, // cookie lifetime follows the token lifetime
};

export const clearCookie = { ...refreshCookie, maxAge: undefined };