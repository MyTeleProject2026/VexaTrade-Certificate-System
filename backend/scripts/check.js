const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const required = [
  "server.js",
  "src/config/database.js",
  "src/config/redis.js",
  "src/models/User.model.js",
  "src/models/Application.model.js",
  "src/models/Certificate.model.js",
  "src/controllers/auth.controller.js",
  "src/controllers/application.controller.js",
  "src/controllers/admin.controller.js",
  "src/controllers/certificate.controller.js",
  "src/controllers/notification.controller.js",
];
const missing = required.filter((f) => !fs.existsSync(path.join(root, f)));
if (missing.length) {
  console.error("Missing files:", missing.join(", "));
  process.exit(1);
}
console.log(`Backend structure check passed (${required.length} required files).`);
