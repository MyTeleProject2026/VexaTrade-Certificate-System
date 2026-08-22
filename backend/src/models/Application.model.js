const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  personalInfo: {
    fullName: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date, required: true },
    nationality: { type: String, required: true },
    countryOfResidence: { type: String, required: true },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, default: "" },
      postalCode: { type: String, default: "" },
      country: { type: String, required: true }
    },
    phoneNumber: { type: String, required: true },
    email: { type: String, required: true, lowercase: true }
  },
  tradingInfo: {
    experience: { type: String, enum: ["beginner","intermediate","advanced","expert"], required: true },
    platforms: [String],
    preferredAssets: [String],
    averageMonthlyVolume: { type: Number, min: 0, required: true },
    strategies: [String],
    totalBalance: { type: Number, min: 0, required: true },
    walletAddress: { type: String, required: true, trim: true },
    blockchainNetwork: { type: String, default: "VexaTrade Mainnet" }
  },
  kyc: {
    idType: { type: String, enum: ["passport","national_id","drivers_license","residence_permit"], required: true },
    idNumber: { type: String, required: true, trim: true },
    idExpiryDate: { type: Date, required: true },
    idFrontImage: { type: String, required: true },
    idBackImage: String,
    selfieImage: { type: String, required: true },
    proofOfAddress: String,
    verificationStatus: { type: String, enum: ["pending","verified","rejected"], default: "pending" },
    verificationDate: Date,
    verificationNotes: String
  },
  certificate: {
    certificateId: { type: String, unique: true, sparse: true, index: true },
    certificateNumber: { type: String, unique: true, sparse: true, index: true },
    issueDate: Date,
    expiryDate: Date,
    blockchainTxHash: String,
    blockchainBlockNumber: Number,
    ipfsHash: String,
    pdfUrl: String,
    svgUrl: String,
    pngUrl: String,
    qrCode: String,
    securityHash: String,
    version: { type: String, default: "3.0" }
  },
  status: {
    type: String,
    enum: ["draft","pending","reviewing","needs_info","approved","rejected","expired","revoked"],
    default: "draft",
    index: true
  },
  priority: { type: String, enum: ["low","medium","high","urgent"], default: "medium" },
  adminNotes: [{
    message: { type: String, required: true },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    type: { type: String, enum: ["note","warning","info","action"], default: "note" },
    createdAt: { type: Date, default: Date.now }
  }],
  adminQuestions: [{
    question: { type: String, required: true },
    answer: String,
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now },
    answeredAt: Date,
    isAnswered: { type: Boolean, default: false }
  }],
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  timeline: [{
    action: String,
    description: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    timestamp: { type: Date, default: Date.now },
    metadata: mongoose.Schema.Types.Mixed
  }],
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: Date,
  approvedAt: Date,
  rejectedAt: Date,
  revokedAt: Date,
  ipAddress: String,
  userAgent: String,
  geoLocation: { country: String, city: String, latitude: Number, longitude: Number },
  metadata: { source: { type: String, default: "web" }, referrer: String, campaign: String, device: String, browser: String, os: String }
}, { timestamps: true, toJSON: { virtuals: true } });

applicationSchema.virtual("isExpired").get(function() {
  return Boolean(this.certificate?.expiryDate && this.certificate.expiryDate < new Date());
});

applicationSchema.virtual("daysPending").get(function() {
  if (!["pending","reviewing","needs_info"].includes(this.status)) return 0;
  return Math.floor((Date.now() - new Date(this.submittedAt).getTime()) / 86400000);
});

applicationSchema.index({ userId: 1, status: 1 });
applicationSchema.index({ status: 1, priority: 1 });
applicationSchema.index({ submittedAt: -1 });

module.exports = mongoose.model("Application", applicationSchema);
