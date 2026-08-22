const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  vexaAccountId: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  name: { type: String, required: true, trim: true },
  avatar: { type: String, default: null },
  passwordHash: { type: String, default: null, select: false },
  role: { type: String, enum: ["user","admin","super_admin","verifier"], default: "user" },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  verificationLevel: { type: String, enum: ["none","basic","full","advanced"], default: "none" },
  lastLogin: Date,
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    },
    language: { type: String, default: "en" },
    timezone: { type: String, default: "UTC" },
    theme: { type: String, default: "dark" }
  },
  metadata: {
    ipAddresses: [String],
    devices: [{ type: String, lastUsed: Date }],
    referrer: String,
    campaign: String
  }
}, { timestamps: true, toJSON: { virtuals: true } });

userSchema.virtual("isLocked").get(function () {
  return Boolean(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.methods.setPassword = async function(password) {
  this.passwordHash = await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS || 12));
};

userSchema.methods.verifyPassword = async function(password) {
  return this.passwordHash ? bcrypt.compare(password, this.passwordHash) : false;
};

userSchema.methods.incrementLoginAttempts = async function() {
  this.loginAttempts += 1;
  if (this.loginAttempts >= 5) this.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
  return this.save();
};

userSchema.methods.resetLoginAttempts = async function() {
  this.loginAttempts = 0;
  this.lockUntil = null;
  return this.save();
};

userSchema.statics.findByEmailOrVexaId = function(email, vexaAccountId) {
  return this.findOne({ $or: [{ email }, { vexaAccountId }] });
};

module.exports = mongoose.model("User", userSchema);
