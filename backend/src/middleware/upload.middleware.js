const multer = require("multer");

const allowed = new Set((process.env.ALLOWED_FILE_TYPES || "image/jpeg,image/png,image/webp,application/pdf")
  .split(",").map((x) => x.trim()).filter(Boolean));

// Memory storage is intentional: KYC files are streamed directly to Cloudinary.
// This avoids relying on Render's ephemeral filesystem for identity documents.
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: Number(process.env.MAX_FILE_SIZE || 10 * 1024 * 1024), files: 4 },
  fileFilter(req, file, cb) {
    if (!allowed.has(file.mimetype)) return cb(new Error(`File type not allowed: ${file.mimetype}`));
    cb(null, true);
  },
});

const applicationUpload = upload.fields([
  { name: "idFrontImage", maxCount: 1 },
  { name: "idBackImage", maxCount: 1 },
  { name: "selfieImage", maxCount: 1 },
  { name: "proofOfAddress", maxCount: 1 },
]);

module.exports = { applicationUpload };
