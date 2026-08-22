const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  userEmail: String,
  userRole: String,
  action: { type: String, required: true, index: true },
  targetType: { type: String, enum: ["user","application","certificate","admin","system","settings"] },
  targetId: mongoose.Schema.Types.ObjectId,
  details: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String,
  status: { type: String, enum: ["success","failure","error"], default: "success" },
  errorMessage: String
}, { timestamps: true });

auditLogSchema.index({ userId: 1, action: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });

auditLogSchema.statics.log = function(data) {
  return this.create(data);
};

module.exports = mongoose.model("AuditLog", auditLogSchema);
