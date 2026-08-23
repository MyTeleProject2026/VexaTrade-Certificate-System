const { v2: cloudinary } = require("cloudinary");
const { Readable } = require("stream");

const configured = Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
if (configured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

function uploadBuffer(buffer, options = {}) {
  if (!configured) throw new Error("Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.");
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder: options.folder || "vexatrade/kyc",
      resource_type: options.resourceType || "auto",
      type: "upload",
      use_filename: false,
      unique_filename: true,
      overwrite: false,
    }, (error, result) => error ? reject(error) : resolve(result));
    Readable.from(buffer).pipe(stream);
  });
}

async function uploadFile(file, folder) {
  return uploadBuffer(file.buffer, {
    folder,
    resourceType: file.mimetype === "application/pdf" ? "raw" : "image",
  });
}

module.exports = { cloudinary, configured, uploadFile };
