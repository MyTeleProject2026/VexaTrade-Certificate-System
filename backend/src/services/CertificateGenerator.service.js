const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const sharp = require("sharp");

const Certificate = require("../models/Certificate.model");
const Application = require("../models/Application.model");
const { anchorCertificate } = require("../config/blockchain");
const { randomToken } = require("../utils/helpers");

const base = path.resolve(process.env.UPLOAD_DIR || "./uploads");

function nextCertificateNumber() {
  return `VTX-${new Date().getUTCFullYear()}-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
}

async function renderPdf(outputPath, data) {
  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const stream = require("fs").createWriteStream(outputPath);
    stream.on("finish", resolve);
    stream.on("error", reject);
    doc.pipe(stream);

    doc.fontSize(28).text(data.issuer, { align: "center" });
    doc.moveDown();
    doc.fontSize(24).text("VexaTrade Trader Certificate", { align: "center" });
    doc.moveDown(1.5);
    doc.fontSize(18).text(data.fullName, { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Certificate Number: ${data.certificateNumber}`, { align: "center" });
    doc.text(`Issued: ${data.issuedOn.toISOString().slice(0,10)}`, { align: "center" });
    doc.text(`Expires: ${data.expiresOn.toISOString().slice(0,10)}`, { align: "center" });
    doc.moveDown(2);
    doc.fontSize(11).text("This certificate records the application and verification status maintained by the VexaTrade certificate backend.");
    doc.moveDown();
    doc.text(`Wallet: ${data.walletAddress}`);
    doc.text(`Security Hash: ${data.securityHash}`);
    doc.end();
  });
}

async function generateForApplication(applicationId, issuedBy) {
  const application = await Application.findById(applicationId).populate("userId");
  if (!application) throw Object.assign(new Error("Application not found"), { statusCode: 404 });
  if (application.status !== "approved") throw Object.assign(new Error("Application must be approved before certificate generation"), { statusCode: 400 });

  const existing = await Certificate.findOne({ applicationId });
  if (existing) return existing;

  const certificateId = `cert_${randomToken(12)}`;
  const certificateNumber = nextCertificateNumber();
  const issuedOn = new Date();
  const expiresOn = new Date(issuedOn.getTime() + Number(process.env.CERTIFICATE_VALIDITY_DAYS || 365) * 86400000);
  const verificationCode = randomToken(18);

  const relativeDir = path.join("certificates");
  await fs.mkdir(path.join(base, relativeDir, "svg"), { recursive: true });
  await fs.mkdir(path.join(base, relativeDir, "png"), { recursive: true });
  await fs.mkdir(path.join(base, relativeDir, "pdf"), { recursive: true });
  await fs.mkdir(path.join(base, relativeDir, "qrcodes"), { recursive: true });

  const payload = {
    certificateId, certificateNumber, applicationId: String(application._id),
    userId: String(application.userId._id), fullName: application.personalInfo.fullName,
    walletAddress: application.tradingInfo.walletAddress, issuedOn, expiresOn,
  };

  const blockchain = await anchorCertificate(payload);
  const securityHash = blockchain.securityHash;

  const verificationUrl = `${process.env.CERTIFICATE_VERIFY_BASE_URL || "http://localhost:5000/api/certificates/verify"}/${verificationCode}`;
  const qrFile = path.join(base, "certificates", "qrcodes", `${certificateId}.png`);
  await QRCode.toFile(qrFile, verificationUrl);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1100">
  <rect width="100%" height="100%" fill="#0b1020"/>
  <rect x="40" y="40" width="1520" height="1020" rx="28" fill="none" stroke="#55d6be" stroke-width="4"/>
  <text x="800" y="180" fill="#55d6be" text-anchor="middle" font-family="Arial" font-size="48">${process.env.CERTIFICATE_ISSUER || "VexaTrade Blockchain Ecosystem"}</text>
  <text x="800" y="280" fill="white" text-anchor="middle" font-family="Arial" font-size="42">VexaTrade Trader Certificate</text>
  <text x="800" y="420" fill="white" text-anchor="middle" font-family="Arial" font-size="54">${application.personalInfo.fullName.replace(/[<>&'"]/g, "")}</text>
  <text x="800" y="510" fill="#cbd5e1" text-anchor="middle" font-family="Arial" font-size="24">Certificate No. ${certificateNumber}</text>
  <text x="800" y="560" fill="#cbd5e1" text-anchor="middle" font-family="Arial" font-size="24">Issued ${issuedOn.toISOString().slice(0,10)} • Expires ${expiresOn.toISOString().slice(0,10)}</text>
  <text x="800" y="680" fill="#cbd5e1" text-anchor="middle" font-family="Arial" font-size="18">Verification code: ${verificationCode}</text>
</svg>`;

  const svgRelative = path.join("certificates","svg",`${certificateId}.svg`);
  const pngRelative = path.join("certificates","png",`${certificateId}.png`);
  const pdfRelative = path.join("certificates","pdf",`${certificateId}.pdf`);

  await fs.writeFile(path.join(base, svgRelative), svg, "utf8");
  await sharp(Buffer.from(svg)).png().toFile(path.join(base, pngRelative));
  await renderPdf(path.join(base, pdfRelative), {
    issuer: process.env.CERTIFICATE_ISSUER || "VexaTrade Blockchain Ecosystem",
    fullName: application.personalInfo.fullName,
    certificateNumber,
    issuedOn,
    expiresOn,
    walletAddress: application.tradingInfo.walletAddress,
    securityHash
  });

  const certificate = await Certificate.create({
    certificateId, certificateNumber, applicationId, userId: application.userId._id,
    holder: { fullName: application.personalInfo.fullName, email: application.personalInfo.email, walletAddress: application.tradingInfo.walletAddress },
    tradingDetails: application.tradingInfo,
    content: { title: "VexaTrade Trader Certificate", issuer: process.env.CERTIFICATE_ISSUER || "VexaTrade Blockchain Ecosystem", issuedOn, expiresOn },
    blockchain: {
      network: blockchain.network,
      transactionHash: blockchain.transactionHash,
      blockNumber: blockchain.blockNumber,
      blockTimestamp: blockchain.transactionHash ? new Date() : undefined,
      contractAddress: process.env.BLOCKCHAIN_CONTRACT_ADDRESS || undefined,
      ipfsHash: blockchain.ipfsHash
    },
    files: {
      svg: `/uploads/${svgRelative.replace(/\\/g, "/")}`,
      png: `/uploads/${pngRelative.replace(/\\/g, "/")}`,
      pdf: `/uploads/${pdfRelative.replace(/\\/g, "/")}`,
      qrCode: `/uploads/certificates/qrcodes/${certificateId}.png`
    },
    status: "active",
    securityHash,
    verificationCode,
    qrCodeData: verificationUrl,
    issuedBy
  });

  application.certificate = {
    certificateId, certificateNumber, issueDate: issuedOn, expiryDate: expiresOn,
    blockchainTxHash: blockchain.transactionHash, blockchainBlockNumber: blockchain.blockNumber,
    ipfsHash: blockchain.ipfsHash, svgUrl: certificate.files.svg, pngUrl: certificate.files.png,
    pdfUrl: certificate.files.pdf, qrCode: certificate.files.qrCode, securityHash
  };
  application.status = "approved";
  application.timeline.push({ action: "certificate_generated", description: "Certificate generated", userId: issuedBy, timestamp: new Date(), metadata: { certificateId } });
  await application.save();

  return certificate;
}

module.exports = { generateForApplication };
