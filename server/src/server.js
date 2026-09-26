require("dotenv").config();

const cors = require("cors");
const cookieParser = require("cookie-parser");
const express = require("express");

const connectDatabase = require("./config/database");
const authRoutes = require("./routes/auth");
const interviewRoutes = require("./routes/interview");
const jobRoutes = require("./routes/jobs");
const resumeRoutes = require("./routes/resume");

const app = express();

// Allowed frontend origins
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.RENDER_EXTERNAL_URL,
  "http://127.0.0.1:5173",
  "http://localhost:5173",
].filter(Boolean);

// CORS
app.use(
  cors({
    origin(origin, callback) {
      // Allow requests without an origin
      // (Postman, server-to-server requests, etc.)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
  }),
);

// Middleware
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/interview", interviewRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/resume", resumeRoutes);

// API 404
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

// Error handler
app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const status = error.status || 500;

  if (status >= 500) {
    console.error(error);
  }

  res.status(status).json({
    message:
      status >= 500 ? "Internal server error" : error.message,
  });
});

// Start server
async function startServer() {
  if (!process.env.MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is required. Configure it in server/.env."
    );
  }

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error(
      "JWT_SECRET must contain at least 32 characters."
    );
  }

  await connectDatabase();

  const port = Number(process.env.PORT) || 5000;

  return app.listen(port, () => {
    console.log(`ResumeIQ API listening on port ${port}`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  app,
  startServer,
};