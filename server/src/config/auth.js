const jwt = require("jsonwebtoken");

const COOKIE_NAME = "resumeiq_token";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

function createSessionToken(userId) {
  return jwt.sign({}, process.env.JWT_SECRET, {
    subject: userId,
    expiresIn: SESSION_TTL_SECONDS,
  });
}

function getSessionCookieOptions() {
  const sameSite = process.env.COOKIE_SAME_SITE || "lax";

  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || sameSite === "none",
    sameSite,
    maxAge: SESSION_TTL_SECONDS * 1000,
    path: "/",
  };
}

module.exports = {
  COOKIE_NAME,
  createSessionToken,
  getSessionCookieOptions,
};