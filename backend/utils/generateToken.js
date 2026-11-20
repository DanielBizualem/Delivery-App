import crypto from "crypto"
import jwt from "jsonwebtoken"

export const generateAccessToken = (user)=>{
    return jwt.sign({id:user.id}, process.env.ACCESS_TOKEN_SECRET, {expiresIn: "15m"})
}

export const generateRefreshToken = (user)=>{
    return jwt.sign({id:user.id},process.env.REFRESH_TOKEN_SECRET, {expiresIn: "7d"})
}

export const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex")

export const refreshCookie = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
}

export const clearCookie = {...refreshCookie, maxAge: undefined}