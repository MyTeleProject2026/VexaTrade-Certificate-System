const crypto = require("crypto");
const path = require("path");

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function safeFilename(name) {
  return path.basename(name).replace(/[^a-zA-Z0-9._-]/g, "_");
}

function toPublicUser(user) {
  if (!user) return null;
  return {
    id: String(user._id),
    vexaAccountId: user.vexaAccountId,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    role: user.role,
    isVerified: user.isVerified,
    isActive: user.isActive,
    verificationLevel: user.verificationLevel,
    preferences: user.preferences,
  };
}

module.exports = { asyncHandler, randomToken, hashToken, safeFilename, toPublicUser };
