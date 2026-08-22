const User = require("../models/User.model");
const Application = require("../models/Application.model");
const Certificate = require("../models/Certificate.model");
const AuditLog = require("../models/AuditLog.model");
const NotificationService = require("../services/Notification.service");
const EmailService = require("../services/Email.service");
const { generateForApplication } = require("../services/CertificateGenerator.service");

exports.dashboard = async (req, res) => {
  const [users, applications, certificates, activeCertificates] = await Promise.all([
    User.countDocuments(),
    Application.countDocuments(),
    Certificate.countDocuments(),
    Certificate.countDocuments({ status: "active" }),
  ]);
  const byStatus = await Application.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
  res.json({ success: true, data: { users, applications, certificates, activeCertificates, applicationsByStatus: byStatus } });
};

exports.listUsers = async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const filter = req.query.role ? { role: req.query.role } : {};
  const [items, total] = await Promise.all([
    User.find(filter).select("-passwordHash").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter)
  ]);
  res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
};

exports.setUserStatus = async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: Boolean(req.body.isActive) }, { new: true }).select("-passwordHash");
  if (!user) return res.status(404).json({ success: false, message: "User not found" });
  await AuditLog.log({ userId: req.userId, userEmail: req.user.email, userRole: req.user.role, action: user.isActive ? "user_unban" : "user_ban", targetType: "user", targetId: user._id, details: { isActive: user.isActive }, ipAddress: req.ip, userAgent: req.headers["user-agent"] });
  res.json({ success: true, data: user });
};

exports.listApplications = async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.priority) filter.priority = req.query.priority;

  const [items, total] = await Promise.all([
    Application.find(filter).populate("userId", "email name role").populate("assignedTo", "email name").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Application.countDocuments(filter)
  ]);
  res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
};

exports.getApplication = async (req, res) => {
  const app = await Application.findById(req.params.id).populate("userId", "email name").populate("assignedTo", "email name");
  if (!app) return res.status(404).json({ success: false, message: "Application not found" });
  res.json({ success: true, data: app });
};

exports.assignApplication = async (req, res) => {
  const app = await Application.findByIdAndUpdate(req.params.id, {
    assignedTo: req.body.userId,
    status: "reviewing",
    $push: { timeline: { action: "assigned", description: "Application assigned", userId: req.userId } }
  }, { new: true });
  if (!app) return res.status(404).json({ success: false, message: "Application not found" });
  res.json({ success: true, data: app });
};

exports.approveApplication = async (req, res) => {
  const app = await Application.findById(req.params.id).populate("userId");
  if (!app) return res.status(404).json({ success: false, message: "Application not found" });
  app.status = "approved";
  app.reviewedBy = req.userId;
  app.reviewedAt = new Date();
  app.approvedAt = new Date();
  app.kyc.verificationStatus = "verified";
  app.kyc.verificationDate = new Date();
  app.timeline.push({ action: "approved", description: "Application approved", userId: req.userId });
  await app.save();

  const certificate = await generateForApplication(app._id, req.userId);
  await NotificationService.createForUser(app.userId._id, {
    type: "application_approved",
    title: "Application approved",
    message: "Your application was approved and your certificate has been generated.",
    data: { applicationId: app._id, certificateId: certificate._id },
    email: true
  }, req.app.get("io"));
  await EmailService.sendApplicationDecision(app.personalInfo.email, { approved: true });

  res.json({ success: true, data: { application: app, certificate } });
};

exports.rejectApplication = async (req, res) => {
  const app = await Application.findById(req.params.id).populate("userId");
  if (!app) return res.status(404).json({ success: false, message: "Application not found" });

  const reason = String(req.body.reason || "Application did not meet verification requirements");
  app.status = "rejected";
  app.reviewedBy = req.userId;
  app.reviewedAt = new Date();
  app.rejectedAt = new Date();
  app.kyc.verificationStatus = "rejected";
  app.kyc.verificationNotes = reason;
  app.timeline.push({ action: "rejected", description: reason, userId: req.userId });
  await app.save();

  await NotificationService.createForUser(app.userId._id, {
    type: "application_rejected",
    title: "Application rejected",
    message: reason,
    data: { applicationId: app._id },
    email: true
  }, req.app.get("io"));
  await EmailService.sendApplicationDecision(app.personalInfo.email, { approved: false, reason });

  res.json({ success: true, data: app });
};

exports.revokeCertificate = async (req, res) => {
  const cert = await Certificate.findById(req.params.id);
  if (!cert) return res.status(404).json({ success: false, message: "Certificate not found" });
  await cert.revoke(String(req.body.reason || "Revoked by administrator"), req.userId);
  await Application.findByIdAndUpdate(cert.applicationId, {
    status: "revoked",
    revokedAt: new Date(),
    $push: { timeline: { action: "revoked", description: cert.revokedReason, userId: req.userId } }
  });
  await NotificationService.createForUser(cert.userId, {
    type: "certificate_revoked",
    title: "Certificate revoked",
    message: cert.revokedReason,
    data: { certificateId: cert._id }
  }, req.app.get("io"));
  res.json({ success: true, data: cert });
};

exports.auditLogs = async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
  const [items, total] = await Promise.all([
    AuditLog.find({}).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    AuditLog.countDocuments()
  ]);
  res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
};
