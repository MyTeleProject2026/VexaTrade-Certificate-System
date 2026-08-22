require("dotenv").config();

const fs = require("fs");
const path = require("path");
const http = require("http");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const { connectDB } = require("./src/config/database");
const redis = require("./src/config/redis");
const logger = require("./src/config/logger");
const errorMiddleware = require("./src/middleware/error.middleware");
const notFound = errorMiddleware.notFound;
const errorHandler = errorMiddleware.errorHandler;

const authRoutes = require("./src/routes/auth.routes");
const applicationRoutes = require("./src/routes/application.routes");
const adminRoutes = require("./src/routes/admin.routes");
const certificateRoutes = require("./src/routes/certificate.routes");
const notificationRoutes = require("./src/routes/notification.routes");

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",").map((v) => v.trim()).filter(Boolean);

const io = new Server(server, { cors: { origin: allowedOrigins, credentials: true } });
app.set("io", io);
app.set("trust proxy", Number(process.env.TRUST_PROXY || 1));

const uploadDir = path.resolve(process.env.UPLOAD_DIR || "./uploads");
fs.mkdirSync(uploadDir, { recursive: true });

app.disable("x-powered-by");
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("CORS origin denied"));
  }, credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

if (process.env.MONGODB_URI) {
  app.use(session({
    secret: process.env.SESSION_SECRET || uuidv4(),
    resave: false, saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
    cookie: {
      httpOnly: true,
      secure: String(process.env.COOKIE_SECURE) === "true",
      sameSite: process.env.COOKIE_SAME_SITE || "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  }));
}

const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MINUTES || 15) * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_MAX || 100),
  standardHeaders: "draft-8", legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again later." },
});
app.use("/api", limiter);

app.use((req, res, next) => {
  const requestId = req.headers["x-request-id"] || uuidv4();
  req.requestId = requestId; res.setHeader("x-request-id", requestId);
  const started = Date.now();
  res.on("finish", () => logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - started}ms requestId=${requestId}`));
  next();
});

app.get("/health", (req, res) => res.json({
  success: true, status: "ok", timestamp: new Date().toISOString(), uptime: process.uptime(),
  services: { mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected", redis: redis.isReady ? "connected" : "disabled" },
  environment: process.env.NODE_ENV || "development", version: require("./package.json").version,
}));

if (String(process.env.MAINTENANCE_MODE) === "true") {
  app.use("/api", (req, res) => res.status(503).json({ success: false, message: process.env.MAINTENANCE_MESSAGE || "System is temporarily under maintenance." }));
}

app.use("/api/auth", authRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/notifications", notificationRoutes);

app.use(notFound);
app.use(errorHandler);

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next();
    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = String(decoded.userId); socket.role = decoded.role;
  } catch (_) {}
  next();
});

io.on("connection", (socket) => {
  logger.info(`Socket connected ${socket.id}`);
  if (socket.userId) socket.join(`user-${socket.userId}`);
  if (["admin", "super_admin", "verifier"].includes(socket.role)) socket.join("admin-room");
  socket.on("join-user", (userId) => {
    if (socket.userId && String(socket.userId) === String(userId)) socket.join(`user-${userId}`);
  });
  socket.on("disconnect", () => logger.info(`Socket disconnected ${socket.id}`));
});

let listener;
async function start() {
  try {
    logger.info(`Starting VexaTrade backend; NODE_ENV=${process.env.NODE_ENV || "development"}`);
    await connectDB();
    logger.info("MongoDB startup check passed");
    await redis.connect();
    logger.info(`Redis startup check: ${redis.enabled ? (redis.isReady ? "connected" : "not ready") : "disabled"}`);
    const port = Number(process.env.PORT || 5000);
    const host = process.env.HOST || "0.0.0.0";
    listener = server.listen(port, host, () => logger.info(`VexaTrade backend listening on ${host}:${port}`));
  } catch (err) {
    console.error("FATAL STARTUP ERROR:", err.stack || err.message || err);
    logger.error(`FATAL STARTUP ERROR: ${err.stack || err.message || err}`);
    process.exitCode = 1;
    throw err;
  }
}

async function shutdown(signal) {
  logger.info(`${signal} received; shutting down`);
  if (listener) await new Promise((resolve) => listener.close(resolve));
  await redis.quit();
  await mongoose.connection.close();
  process.exit(0);
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

if (require.main === module) {
  start().catch(() => process.exit(1));
}
module.exports = { app, server, io };
