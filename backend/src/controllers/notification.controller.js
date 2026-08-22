const Notification = require("../models/Notification.model");

exports.list = async (req, res) => {
  const items = await Notification.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(100);
  res.json({ success: true, data: items });
};

exports.unread = async (req, res) => {
  const items = await Notification.find({ userId: req.userId, readAt: null }).sort({ createdAt: -1 }).limit(100);
  res.json({ success: true, data: items, count: items.length });
};

exports.markRead = async (req, res) => {
  const item = await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, { readAt: new Date() }, { new: true });
  if (!item) return res.status(404).json({ success: false, message: "Notification not found" });
  res.json({ success: true, data: item });
};

exports.markAllRead = async (req, res) => {
  await Notification.updateMany({ userId: req.userId, readAt: null }, { $set: { readAt: new Date() } });
  res.json({ success: true, message: "All notifications marked as read" });
};
