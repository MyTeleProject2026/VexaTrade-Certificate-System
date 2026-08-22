const jwt = require("jsonwebtoken");
const User = require("../models/User.model");

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: "Authentication required" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) return res.status(401).json({ success: false, message: "Invalid or inactive account" });

    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: error.name === "TokenExpiredError" ? "Access token expired" : "Invalid access token" });
  }
}

module.exports = { requireAuth };
