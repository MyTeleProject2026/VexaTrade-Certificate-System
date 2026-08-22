const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User.model");
const AuditLog = require("../models/AuditLog.model");
const { toPublicUser, randomToken, hashToken } = require("../utils/helpers");
const redis = require("../config/redis");

function signAccessToken(user) {
  return jwt.sign({ userId: user._id, role: user.role, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
  });
}

function signRefreshToken(user, jti) {
  return jwt.sign({ userId: user._id, jti }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  });
}

async function issueTokens(user) {
  const refreshId = randomToken(18);
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user, refreshId);
  await redis.set(`refresh:${refreshId}`, String(user._id), { EX: 30 * 86400 });
  return { accessToken, refreshToken };
}

exports.ssoLogin = async (req, res) => {
  const { vexaAccountId, email, name, avatar, accessToken } = req.body;
  if (!vexaAccountId || !email) return res.status(400).json({ success: false, message: "vexaAccountId and email are required" });

  if (String(process.env.VEXA_ACCOUNT_SSO_ENABLED) === "true") {
    if (!accessToken) return res.status(401).json({ success: false, message: "SSO access token required" });
    const response = await fetch(`${process.env.VEXA_ACCOUNT_SSO_URL.replace(/\/$/, "")}/verify`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return res.status(401).json({ success: false, message: "SSO verification failed" });
  }

  let user = await User.findOne({ $or: [{ vexaAccountId }, { email: email.toLowerCase() }] });
  if (!user) {
    user = new User({ vexaAccountId, email: email.toLowerCase(), name: name || email.split("@")[0], avatar });
    await user.save();
    await AuditLog.log({ userId: user._id, userEmail: user.email, action: "register", targetType: "user", targetId: user._id, ipAddress: req.ip, userAgent: req.headers["user-agent"] });
  } else if (user.isLocked) {
    return res.status(423).json({ success: false, message: "Account temporarily locked" });
  }

  user.lastLogin = new Date();
  await user.save();
  const tokens = await issueTokens(user);

  await AuditLog.log({ userId: user._id, userEmail: user.email, userRole: user.role, action: "login", targetType: "user", targetId: user._id, ipAddress: req.ip, userAgent: req.headers["user-agent"] });

  res.json({ success: true, data: { ...tokens, user: toPublicUser(user) } });
};

exports.localLogin = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: "email and password are required" });

  const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");
  if (!user || !user.passwordHash) return res.status(401).json({ success: false, message: "Invalid credentials" });
  if (user.isLocked) return res.status(423).json({ success: false, message: "Account temporarily locked" });

  const valid = await user.verifyPassword(password);
  if (!valid) {
    await user.incrementLoginAttempts();
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  await user.resetLoginAttempts();
  user.lastLogin = new Date();
  await user.save();
  const tokens = await issueTokens(user);
  res.json({ success: true, data: { ...tokens, user: toPublicUser(user) } });
};

exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const userId = await redis.get(`refresh:${decoded.jti}`);
    if (!userId || String(userId) !== String(decoded.userId)) return res.status(401).json({ success: false, message: "Invalid refresh token" });
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) return res.status(401).json({ success: false, message: "Invalid account" });
    res.json({ success: true, data: { accessToken: signAccessToken(user) } });
  } catch {
    res.status(401).json({ success: false, message: "Invalid refresh token" });
  }
};

exports.logout = async (req, res) => {
  await AuditLog.log({ userId: req.userId, userEmail: req.user.email, userRole: req.user.role, action: "logout", targetType: "user", targetId: req.userId, ipAddress: req.ip, userAgent: req.headers["user-agent"] });
  res.json({ success: true, message: "Logged out" });
};

exports.getMe = async (req, res) => {
  res.json({ success: true, data: toPublicUser(req.user) });
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.userId).select("+passwordHash");
  if (!user) return res.status(404).json({ success: false, message: "User not found" });
  if (!currentPassword || !newPassword || newPassword.length < 10) return res.status(400).json({ success: false, message: "A new password of at least 10 characters is required" });
  if (!(await user.verifyPassword(currentPassword))) return res.status(401).json({ success: false, message: "Current password is incorrect" });
  await user.setPassword(newPassword);
  await user.save();
  res.json({ success: true, message: "Password changed" });
};

exports.createLocalUser = async (req, res) => {
  const { email, name, password, vexaAccountId } = req.body;
  if (!email || !name || !password) return res.status(400).json({ success: false, message: "email, name and password are required" });
  if (password.length < 10) return res.status(400).json({ success: false, message: "Password must be at least 10 characters" });

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) return res.status(409).json({ success: false, message: "Email already registered" });

  const user = new User({ email: email.toLowerCase(), name, vexaAccountId: vexaAccountId || `local_${crypto.randomUUID()}` });
  await user.setPassword(password);
  await user.save();

  res.status(201).json({ success: true, data: { user: toPublicUser(user) } });
};
