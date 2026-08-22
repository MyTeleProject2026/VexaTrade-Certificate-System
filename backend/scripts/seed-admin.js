require("dotenv").config();

const { connectDB, closeDB } = require("../src/config/database");
const User = require("../src/models/User.model");

async function main() {
  const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || "");

  if (!email) {
    throw new Error("ADMIN_EMAIL is required. Set it in Render Environment Variables before running npm run seed:admin.");
  }

  if (!password || password.length < 12) {
    throw new Error("ADMIN_PASSWORD is required and must be at least 12 characters long.");
  }

  await connectDB();

  let user = await User.findOne({ email });

  if (!user) {
    user = new User({
      email,
      name: process.env.ADMIN_NAME || "System Admin",
      vexaAccountId: `admin_${Date.now()}`,
    });
  }

  user.email = email;
  user.name = process.env.ADMIN_NAME || user.name || "System Admin";
  user.role = "super_admin";
  user.isVerified = true;
  user.isActive = true;
  user.loginAttempts = 0;
  user.lockUntil = null;
  await user.setPassword(password);
  await user.save();

  console.log(`Admin ready: ${email}`);
  console.log("Role: super_admin");
  console.log("Verified: true");
  console.log("Active: true");
}

main()
  .catch((err) => {
    console.error("Admin seed failed:", err.stack || err.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await closeDB(); } catch {}
  });
