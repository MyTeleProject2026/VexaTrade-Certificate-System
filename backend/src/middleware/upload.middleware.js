const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

const base = path.resolve(process.env.UPLOAD_DIR || "./uploads");
const dirs = {
  idFrontImage: "kyc/id-front",
  idBackImage: "kyc/id-back",
  selfieImage: "kyc/selfies",
  proofOfAddress: "kyc/proof-address",
};

for (const relative of Object.values(dirs)) fs.mkdirSync(path.join(base, relative), { recursive: true });

const allowed = new Set((process.env.ALLOWED_FILE_TYPES || "image/jpeg,image/png,image/webp,application/pdf")
  .split(",").map((x) => x.trim()).filter(Boolean));

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const relative = dirs[file.fieldname] || "temp";
    const destination = path.join(base, relative);
    fs.mkdirSync(destination, { recursive: true });
    cb(null, destination);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${uuidv4()}${ext}`);
  },
});

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
