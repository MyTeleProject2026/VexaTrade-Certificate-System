const Certificate = require("../models/Certificate.model");

exports.listMyCertificates = async (req, res) => {
  const items = await Certificate.find({ userId: req.userId }).sort({ createdAt: -1 });
  res.json({ success: true, data: items });
};

exports.getCertificate = async (req, res) => {
  const cert = await Certificate.findOne({ _id: req.params.id, userId: req.userId });
  if (!cert) return res.status(404).json({ success: false, message: "Certificate not found" });
  res.json({ success: true, data: cert });
};

exports.verify = async (req, res) => {
  const cert = await Certificate.findOne({ $or: [{ verificationCode: req.params.code }, { certificateNumber: req.params.code }] });
  if (!cert) return res.status(404).json({ success: false, valid: false, message: "Certificate not found" });

  await cert.recordVerification(req.ip, req.headers["user-agent"]);
  const valid = cert.status === "active" && new Date(cert.content.expiresOn) > new Date();

  res.json({
    success: true,
    valid,
    data: {
      certificateNumber: cert.certificateNumber,
      certificateId: cert.certificateId,
      holder: cert.holder,
      issuer: cert.content.issuer,
      issuedOn: cert.content.issuedOn,
      expiresOn: cert.content.expiresOn,
      status: cert.status,
      blockchain: cert.blockchain,
      securityHash: cert.securityHash,
      verificationCount: cert.verificationCount,
      files: cert.files
    }
  });
};

exports.download = async (req, res) => {
  const cert = await Certificate.findOne({ _id: req.params.id, userId: req.userId });
  if (!cert?.files?.pdf) return res.status(404).json({ success: false, message: "PDF not found" });
  const absolute = require("path").join(require("../services/Storage.service").base, cert.files.pdf.replace(/^\/uploads\//, ""));
  res.download(absolute, `${cert.certificateNumber}.pdf`);
};
