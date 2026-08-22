const mongoose = require('mongoose');
const ApplicationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fullName: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  nationality: { type: String, required: true },
  countryOfResidence: { type: String, required: true },
  address: { street: String, city: String, state: String, postalCode: String, country: String },
  phoneNumber: { type: String, required: true },
  email: { type: String, required: true },
  tradingExperience: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'expert'], required: true },
  tradingPlatforms: [String],
  preferredAssets: [String],
  averageMonthlyVolume: { type: Number, required: true },
  tradingStrategies: [String],
  kyc: {
    idType: { type: String, enum: ['passport', 'national_id', 'drivers_license'], required: true },
    idNumber: { type: String, required: true },
    idExpiryDate: { type: Date, required: true },
    idFrontImage: String, idBackImage: String, selfieImage: String, proofOfAddress: String
  },
  totalBalance: { type: Number, required: true },
  walletAddress: { type: String, required: true },
  blockchainNetwork: { type: String, default: 'VexaTrade Mainnet' },
  certificate: {
    certificateId: String, issueDate: Date, expiryDate: Date, certificateNumber: String,
    blockchainTxHash: String, blockchainBlockNumber: Number, ipfsHash: String,
    pdfUrl: String, svgUrl: String, pngUrl: String
  },
  status: { type: String, enum: ['pending', 'reviewing', 'approved', 'rejected', 'needs_info'], default: 'pending' },
  adminNotes: [{
    message: String, adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }],
  adminQuestions: [{
    question: String, answer: String, adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: Date, answeredAt: Date
  }],
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: Date, approvedAt: Date, rejectedAt: Date,
  ipAddress: String, userAgent: String,
  geoLocation: { country: String, city: String }
}, { timestamps: true });
ApplicationSchema.index({ userId: 1, status: 1 });
ApplicationSchema.index({ 'certificate.certificateNumber': 1 });
ApplicationSchema.index({ status: 1, createdAt: -1 });
ApplicationSchema.index({ createdAt: -1 });
module.exports = mongoose.model('Application', ApplicationSchema);