const { validateApplicationData, validateKYCData } = require("../utils/validators");

function validateCreateApplication(req, res, next) {
  let data = {};
  try {
    data = typeof req.body.applicationData === "string" ? JSON.parse(req.body.applicationData) : (req.body.applicationData || req.body);
  } catch {
    return res.status(400).json({ success: false, message: "applicationData must be valid JSON" });
  }
  req.applicationData = data;

  const errors = [
    ...validateApplicationData(data),
    ...validateKYCData(data.kyc),
  ];
  if (errors.length) return res.status(400).json({ success: false, message: "Validation failed", errors });
  next();
}

module.exports = { validateCreateApplication };
