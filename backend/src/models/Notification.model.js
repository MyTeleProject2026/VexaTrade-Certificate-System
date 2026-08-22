const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  type: { type: String, required: true, index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  channels: { email: { type: Boolean, default: false }, push: { type: Boolean, default: true } },
  readAt: Date,
  createdAt: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

notificationSchema.virtual("isRead").get(function() { return Boolean(this.readAt); });

module.exports = mongoose.model("Notification", notificationSchema);
