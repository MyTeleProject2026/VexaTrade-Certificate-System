const Application = require("../models/Application.model");
const AuditLog = require("../models/AuditLog.model");
const NotificationService = require("../services/Notification.service");
const EmailService = require("../services/Email.service");
const CertificateGenerator = require("../services/CertificateGenerator.service");
const { uploadFile } = require("../services/Cloudinary.service");

function parseData(req) {
  return req.applicationData || (typeof req.body.applicationData === "string" ? JSON.parse(req.body.applicationData) : req.body.applicationData || req.body);
}

async function storeKycFiles(files = {}) {
  const mapping = {
    idFrontImage: "vexatrade/kyc/id-front",
    idBackImage: "vexatrade/kyc/id-back",
    selfieImage: "vexatrade/kyc/selfies",
    proofOfAddress: "vexatrade/kyc/proof-address",
  };
  const result = {};
  for (const [field, folder] of Object.entries(mapping)) {
    const file = files[field]?.[0];
    if (!file) continue;
    const uploaded = await uploadFile(file, folder);
    result[field] = uploaded.secure_url;
    result[`${field}PublicId`] = uploaded.public_id;
  }
  return result;
}

exports.submitApplication = async (req, res) => {
  const data = parseData(req);
  const existing = await Application.findOne({ userId: req.userId, status: { $in: ["pending", "reviewing", "needs_info"] } });
  if (existing) return res.status(409).json({ success: false, message: "You already have a pending application", applicationId: existing._id });

  const files = req.files || {};
  if (!files.idFrontImage?.[0] || !files.selfieImage?.[0]) {
    return res.status(400).json({ success: false, message: "Government ID front and selfie are required" });
  }

  let stored;
  try {
    stored = await storeKycFiles(files);
  } catch (error) {
    return res.status(503).json({ success: false, message: "KYC storage is not configured or upload failed" });
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
      email: data.email,
    },
    tradingInfo: {
      experience: data.tradingExperience,
      platforms: data.tradingPlatforms || [],
      preferredAssets: data.preferredAssets || [],
      averageMonthlyVolume: Number(data.averageMonthlyVolume),
      strategies: data.tradingStrategies || [],
      totalBalance: Number(data.totalBalance),
      walletAddress: data.walletAddress,
      blockchainNetwork: data.blockchainNetwork || "VexaTrade Mainnet",
    },
    depositInfo: {
      amount: Number(data.depositAmount),
      currency: data.depositCurrency,
      depositDate: data.depositDate,
      network: data.depositNetwork,
      method: data.depositMethod || "blockchain_transfer",
      transactionHash: data.depositTransactionHash || null,
      walletAddress: data.depositWalletAddress || data.walletAddress,
      proofUrl: data.depositProofUrl || null,
      verificationStatus: "pending",
    },
    kyc: {
      idType: data.kyc.idType,
      idNumber: data.kyc.idNumber,
      idExpiryDate: data.kyc.idExpiryDate,
      idFrontImage: stored.idFrontImage,
      idFrontImagePublicId: stored.idFrontImagePublicId,
      idBackImage: stored.idBackImage || null,
      idBackImagePublicId: stored.idBackImagePublicId || null,
      selfieImage: stored.selfieImage,
      selfieImagePublicId: stored.selfieImagePublicId,
      proofOfAddress: stored.proofOfAddress || null,
      proofOfAddressPublicId: stored.proofOfAddressPublicId || null,
      verificationStatus: "pending",
    },
    status: "pending",
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
    submittedAt: new Date(),
    timeline: [{ action: "submitted", description: "Application and KYC submitted for review", userId: req.userId }],
  });

  await AuditLog.log({ userId: req.userId, userEmail: req.user.email, userRole: req.user.role, action: "application_submit", targetType: "application", targetId: application._id, ipAddress: req.ip, userAgent: req.headers["user-agent"] });
  await NotificationService.notifyAdmins({ type: "new_application", title: "New KYC application", message: `${data.fullName} submitted an application`, data: { applicationId: application._id } }, req.app.get("io"));
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
    Application.countDocuments(filter),
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
  if (!["draft", "needs_info"].includes(app.status)) return res.status(409).json({ success: false, message: "Application cannot be edited in its current state" });
  if (req.body.personalInfo) app.personalInfo = { ...(app.personalInfo || {}), ...req.body.personalInfo };
  if (req.body.tradingInfo) app.tradingInfo = { ...(app.tradingInfo || {}), ...req.body.tradingInfo };
  if (req.body.depositInfo) app.depositInfo = { ...(app.depositInfo || {}), ...req.body.depositInfo };
  app.timeline.push({ action: "updated", description: "Application updated", userId: req.userId });
  await app.save();
  res.json({ success: true, data: app });
};

exports.submitDraft = async (req, res) => {
  const app = await Application.findOne({ _id: req.params.id, userId: req.userId });
  if (!app) return res.status(404).json({ success: false, message: "Application not found" });
  if (app.status !== "draft") return res.status(409).json({ success: false, message: "Application is not a draft" });
  app.status = "pending";
  app.submittedAt = new Date();
  app.timeline.push({ action: "submitted", description: "Draft submitted", userId: req.userId });
  await app.save();
  res.json({ success: true, data: app });
};

exports.getStatus = async (req, res) => {
  const app = await Application.findOne({ _id: req.params.id, userId: req.userId }).select("status certificate timeline kyc depositInfo updatedAt");
  if (!app) return res.status(404).json({ success: false, message: "Application not found" });
  res.json({ success: true, data: app });
};

exports.deleteApplication = async (req, res) => {
  const app = await Application.findOne({ _id: req.params.id, userId: req.userId });
  if (!app) return res.status(404).json({ success: false, message: "Application not found" });
  if (!["draft", "rejected"].includes(app.status)) return res.status(409).json({ success: false, message: "Application cannot be deleted" });
  await app.deleteOne();
  res.json({ success: true, message: "Application deleted" });
};
