const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
  vexaAccountId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  avatar: String,
  role: { type: String, enum: ['user', 'admin', 'super_admin'], default: 'user' },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date, default: Date.now },
  preferences: {
    notifications: { type: Boolean, default: true },
    language: { type: String, default: 'en' }
  }
}, { timestamps: true });
UserSchema.index({ vexaAccountId: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
module.exports = mongoose.model('User', UserSchema);