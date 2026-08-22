require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../src/models/User.model");

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const email = process.env.ADMIN_EMAIL || "admin@example.com";
  const password = process.env.ADMIN_PASSWORD || "ChangeThisImmediately123!";
  let user = await User.findOne({ email });
  if (!user) user = new User({ email, name: "System Admin", vexaAccountId: `admin_${Date.now()}`, role: "super_admin", isVerified: true });
  user.role = "super_admin";
  user.isVerified = true;
  await user.setPassword(password);
  await user.save();
  console.log(`Admin ready: ${email}`);
  await mongoose.disconnect();
})().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
