const Application = require("../models/Application.model");
const AuditLog = require("../models/AuditLog.model");
const NotificationService = require("../services/Notification.service");
const EmailService = require("../services/Email.service");
const CertificateGenerator = require("../services/CertificateGenerator.service");

function parseData(req) {
  return req.applicationData || (typeof req.body.applicationData === "string" ? JSON.parse(req.body.applicationData) : req.body.applicationData || req.body);
}

exports.submitApplication = async (req, res) => {
  const data = parseData(req);
  const existing = await Application.findOne({ userId: req.userId, status: { $in: ["pending","reviewing","needs_info"] } });
  if (existing) return res.status(409).json({ success: false, message: "You already have a pending application", applicationId: existing._id });

  const files = req.files || {};
  const filePath = (field, relative) => files[field]?.[0] ? `/uploads/${relative}/${files[field][0].filename}` : null;

  if (!files.idFrontImage?.[0] || !files.selfieImage?.[0]) {
    return res.status(400).json({ success: false, message: "idFrontImage and selfieImage are required" });
  }

  const application = await Application.create({
    userId: req.userId,
    personalInfo: {
      fullName: data.fullName,
      dateOfBirth: data.dateOfBirth,
      nationality: data.nationality,
      countryOfResidence: data.countryOfResidence,
      address: data.address,
      phoneNumber: data.phoneNumber,
      email: data.email
    },
    tradingInfo: {
      experience: data.tradingExperience,
      platforms: data.tradingPlatforms || [],
      preferredAssets: data.preferredAssets || [],
      averageMonthlyVolume: Number(data.averageMonthlyVolume),
      strategies: data.tradingStrategies || [],
      totalBalance: Number(data.totalBalance),
      walletAddress: data.walletAddress,
      blockchainNetwork: data.blockchainNetwork || "VexaTrade Mainnet"
    },
    kyc: {
      idType: data.kyc.idType,
      idNumber: data.kyc.idNumber,
      idExpiryDate: data.kyc.idExpiryDate,
      idFrontImage: filePath("idFrontImage","kyc/id-front"),
      idBackImage: filePath("idBackImage","kyc/id-back"),
      selfieImage: filePath("selfieImage","kyc/selfies"),
      proofOfAddress: filePath("proofOfAddress","kyc/proof-address")
    },
    status: "pending",
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
    timeline: [{ action: "submitted", description: "Application submitted", userId: req.userId }]
  });

  await AuditLog.log({ userId: req.userId, userEmail: req.user.email, userRole: req.user.role, action: "application_submit", targetType: "application", targetId: application._id, ipAddress: req.ip, userAgent: req.headers["user-agent"] });
  await NotificationService.notifyAdmins({
    type: "new_application",
    title: "New application",
    message: `${data.fullName} submitted an application`,
    data: { applicationId: application._id }
  }, req.app.get("io"));
  await EmailService.sendApplicationConfirmation(data.email, { name: data.fullName, applicationId: application._id });

  res.status(201).json({ success: true, data: { applicationId: application._id, status: application.status } });
};

exports.getMyApplications = async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(50, Math.max(1, Number(req.query.limit || 10)));
  const filter = { userId: req.userId };
  if (req.query.status) filter.status = req.query.status;
  const [items, total] = await Promise.all([
    Application.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Application.countDocuments(filter)
  ]);
  res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
};

exports.getById = async (req, res) => {
  const app = await Application.findOne({ _id: req.params.id, userId: req.userId });
  if (!app) return res.status(404).json({ success: false, message: "Application not found" });
  res.json({ success: true, data: app });
};

exports.updateApplication = async (req, res) => {
  const app = await Application.findOne({ _id: req.params.id, userId: req.userId });
  if (!app) return res.status(404).json({ success: false, message: "Application not found" });
  if (!["draft","needs_info"].includes(app.status)) return res.status(409).json({ success: false, message: "Application cannot be edited in its current state" });

  const updates = req.body;
  if (updates.personalInfo) app.personalInfo = { ...app.personalInfo.toObject(), ...updates.personalInfo };
  if (updates.tradingInfo) app.tradingInfo = { ...app.tradingInfo.toObject(), ...updates.tradingInfo };
  app.timeline.push({ action: "updated", description: "Application updated", userId: req.userId });
  await app.save();

  res.json({ success: true, data: app });
};

exports.submitDraft = async (req, res) => {
  const app = await Application.findOne({ _id: req.params.id, userId: req.userId });
  if (!app) return res.status(404).json({ success: false, message: "Application not found" });
  if (app.status !== "draft") return res.status(409).json({ success: false, message: "Application is not a draft" });
  app.status = "pending";
  app.timeline.push({ action: "submitted", description: "Draft submitted", userId: req.userId });
  await app.save();
  res.json({ success: true, data: app });
};

exports.getStatus = async (req, res) => {
  const app = await Application.findOne({ _id: req.params.id, userId: req.userId }).select("status certificate timeline updatedAt");
  if (!app) return res.status(404).json({ success: false, message: "Application not found" });
  res.json({ success: true, data: app });
};

exports.deleteApplication = async (req, res) => {
  const app = await Application.findOne({ _id: req.params.id, userId: req.userId });
  if (!app) return res.status(404).json({ success: false, message: "Application not found" });
  if (!["draft","rejected"].includes(app.status)) return res.status(409).json({ success: false, message: "Application cannot be deleted" });
  await app.deleteOne();
  res.json({ success: true, message: "Application deleted" });
};
