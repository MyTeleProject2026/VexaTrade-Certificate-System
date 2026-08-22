const Notification = require("../models/Notification.model");
const User = require("../models/User.model");
const EmailService = require("./Email.service");

async function createForUser(userId, input, io) {
  const notification = await Notification.create({
    userId,
    type: input.type,
    title: input.title,
    message: input.message,
    data: input.data || {},
    channels: input.channels || {},
  });

  if (io) io.to(`user-${userId}`).emit("notification", notification);

  if (input.email) {
    const user = await User.findById(userId).select("email");
    if (user?.email) await EmailService.send(user.email, input.title, `<p>${input.message}</p>`, input.message);
  }

  return notification;
}

async function notifyAdmins(input, io) {
  const admins = await User.find({ role: { $in: ["admin","super_admin","verifier"] }, isActive: true }).select("_id email");
  return Promise.all(admins.map((admin) => createForUser(admin._id, {
    ...input,
    type: input.type,
    channels: { push: true },
  }, io)));
}

module.exports = { createForUser, notifyAdmins };
