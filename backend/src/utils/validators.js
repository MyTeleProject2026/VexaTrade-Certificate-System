function isNonEmpty(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function validateApplicationData(data = {}) {
  const errors = [];
  const required = [
    ["fullName", data.fullName], ["dateOfBirth", data.dateOfBirth], ["nationality", data.nationality],
    ["countryOfResidence", data.countryOfResidence], ["phoneNumber", data.phoneNumber], ["email", data.email],
    ["tradingExperience", data.tradingExperience], ["averageMonthlyVolume", data.averageMonthlyVolume],
    ["totalBalance", data.totalBalance], ["walletAddress", data.walletAddress],
    ["depositAmount", data.depositAmount], ["depositCurrency", data.depositCurrency],
    ["depositDate", data.depositDate], ["depositNetwork", data.depositNetwork],
  ];
  for (const [field, value] of required) if (!isNonEmpty(value)) errors.push(`${field} is required`);
  if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) errors.push("email is invalid");
  if (data.dateOfBirth && Number.isNaN(Date.parse(data.dateOfBirth))) errors.push("dateOfBirth is invalid");
  if (data.depositDate && Number.isNaN(Date.parse(data.depositDate))) errors.push("depositDate is invalid");
  if (data.address && (!isNonEmpty(data.address.street) || !isNonEmpty(data.address.city) || !isNonEmpty(data.address.country))) {
    errors.push("address.street, address.city and address.country are required");
  } else if (!data.address) errors.push("address is required");
  return errors;
}

function validateKYCData(data = {}) {
  const errors = [];
  if (!["passport", "national_id", "drivers_license", "residence_permit"].includes(data.idType)) errors.push("invalid kyc.idType");
  if (!isNonEmpty(data.idNumber)) errors.push("kyc.idNumber is required");
  if (!isNonEmpty(data.idExpiryDate)) errors.push("kyc.idExpiryDate is required");
  return errors;
}

module.exports = { validateApplicationData, validateKYCData };
