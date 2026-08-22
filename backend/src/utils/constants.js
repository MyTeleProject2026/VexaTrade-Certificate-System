module.exports = {
  ROLES: ["user", "admin", "super_admin", "verifier"],
  APPLICATION_STATUSES: ["draft", "pending", "reviewing", "needs_info", "approved", "rejected", "expired", "revoked"],
  CERTIFICATE_STATUSES: ["active", "revoked", "expired", "suspended"],
  ID_TYPES: ["passport", "national_id", "drivers_license", "residence_permit"],
  MAX_LOGIN_ATTEMPTS: 5,
  LOCK_MINUTES: 15,
};
