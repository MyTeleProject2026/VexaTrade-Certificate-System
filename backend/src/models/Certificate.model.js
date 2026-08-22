const mongoose = require("mongoose");

const certificateSchema = new mongoose.Schema({
  certificateId: { type: String, required: true, unique: true, index: true },
  certificateNumber: { type: String, required: true, unique: true, index: true },
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: "Application", required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  holder: {
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    walletAddress: { type: String, required: true }
  },
  tradingDetails: {
    experience: String,
    totalBalance: Number,
    assets: [String],
    platforms: [String]
  },
  content: {
    title: { type: String, default: "VexaTrade Trader Certificate" },
    description: String,
    issuer: { type: String, default: "VexaTrade Blockchain Ecosystem" },
    issuedOn: { type: Date, required: true },
    expiresOn: { type: Date, required: true }
  },
  blockchain: {
    network: { type: String, default: "mainnet" },
    transactionHash: { type: String, unique: true, sparse: true },
    blockNumber: Number,
    blockTimestamp: Date,
    contractAddress: String,
    ipfsHash: String
  },
  files: {
    svg: { type: String, required: true },
    png: { type: String, required: true },
    pdf: String,
    qrCode: String
  },
  status: { type: String, enum: ["active","revoked","expired","suspended"], default: "active", index: true },
  securityHash: { type: String, required: true, index: true },
  verificationCode: { type: String, required: true, unique: true, index: true },
  qrCodeData: { type: String, required: true },
  version: { type: String, default: "3.0" },
  templateId: { type: String, default: "default" },
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  revokedReason: String,
  revokedAt: Date,
  verifications: [{ ip: String, userAgent: String, timestamp: { type: Date, default: Date.now } }],
  verificationCount: { type: Number, default: 0 }
}, { timestamps: true, toJSON: { virtuals: true } });

certificateSchema.virtual("isExpired").get(function() {
  return this.content?.expiresOn && this.content.expiresOn < new Date();
});
certificateSchema.virtual("isValid").get(function() {
  return this.status === "active" && !this.isExpired;
});

certificateSchema.methods.recordVerification = function(ip, userAgent) {
  this.verifications.push({ ip, userAgent, timestamp: new Date() });
  this.verificationCount += 1;
  return this.save();
};

certificateSchema.methods.revoke = function(reason, revokedBy) {
  this.status = "revoked";
  this.revokedReason = reason;
  this.revokedBy = revokedBy;
  this.revokedAt = new Date();
  return this.save();
};

module.exports = mongoose.model("Certificate", certificateSchema);
