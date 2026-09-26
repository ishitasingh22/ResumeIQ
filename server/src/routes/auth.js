const bcrypt = require("bcryptjs");
const express = require("express");
const User = require("../models/User");
const requireAuth = require("../middleware/requireAuth");
const {
  COOKIE_NAME,
  createSessionToken,
  getSessionCookieOptions,
} = require("../config/auth");

const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

function startSession(res, user) {
  const token = createSessionToken(user._id.toString());
  res.cookie(COOKIE_NAME, token, getSessionCookieOptions());
}

router.post("/register", async (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const email =
    typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!name || name.length > 80) {
    return res.status(400).json({ message: "Name is required and must be at most 80 characters" });
  }

  if (email.length > 254 || !emailPattern.test(email)) {
    return res.status(400).json({ message: "Enter a valid email address" });
  }

  if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
    return res.status(400).json({ message: "Password must be 8-72 bytes long" });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash });

    startSession(res, user);
    return res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }
    return res.status(500).json({ message: "Unable to create account" });
  }
});

router.post("/login", async (req, res) => {
  const email =
    typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!emailPattern.test(email) || !password) {
    return res.status(400).json({ message: "Enter a valid email and password" });
  }

  try {
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    startSession(res, user);
    return res.json({ user: publicUser(user) });
  } catch {
    return res.status(500).json({ message: "Unable to sign in" });
  }
});

router.post("/logout", (req, res) => {
  const clearOptions = getSessionCookieOptions();
  delete clearOptions.maxAge;
  res.clearCookie(COOKIE_NAME, clearOptions);
  return res.json({ message: "Signed out" });
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(401).json({ message: "Account no longer exists" });
    }

    return res.json({ user: publicUser(user) });
  } catch {
    return res.status(500).json({ message: "Unable to load account" });
  }
});

module.exports = router;