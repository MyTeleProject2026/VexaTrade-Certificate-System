const fs = require("fs/promises");
const path = require("path");

const base = path.resolve(process.env.UPLOAD_DIR || "./uploads");

async function ensure(relativeDir) {
  const absolute = path.join(base, relativeDir);
  await fs.mkdir(absolute, { recursive: true });
  return absolute;
}

async function saveBuffer(relativeDir, filename, buffer) {
  const dir = await ensure(relativeDir);
  const fullPath = path.join(dir, filename);
  await fs.writeFile(fullPath, buffer);
  return fullPath;
}

function publicUrl(relativePath) {
  return `/uploads/${relativePath.replace(/^\/+/, "").replace(/\\/g, "/")}`;
}

module.exports = { ensure, saveBuffer, publicUrl, base };
