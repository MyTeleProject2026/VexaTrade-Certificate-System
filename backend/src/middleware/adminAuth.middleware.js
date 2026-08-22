function requireAdmin(req, res, next) {
  const allowed = ["admin", "super_admin", "verifier"];
  if (!req.user || !allowed.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: "Administrator access required" });
  }
  next();
}

function requireSuperAdmin(req, res, next) {
  if (!req.user || req.user.role !== "super_admin") {
    return res.status(403).json({ success: false, message: "Super administrator access required" });
  }
  next();
}

module.exports = { requireAdmin, requireSuperAdmin };
