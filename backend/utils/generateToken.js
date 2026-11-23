import crypto from "crypto"
import jwt from "jsonwebtoken"

export const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex")

export const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const generateAccessToken = (user, sessionId) => {
    return jwt.sign(
        { id: user.id, sid: String(sessionId) },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" }
    )
}

export const generateRefreshToken = (user, sessionId) => {
    return jwt.sign(
        { id: user.id, sid: String(sessionId) },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "7d", jwtid: crypto.randomUUID() } // unique per rotation
    )
}

export const refreshCookie = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: REFRESH_TTL_MS,
}

export const clearCookie = {...refreshCookie, maxAge: undefined}