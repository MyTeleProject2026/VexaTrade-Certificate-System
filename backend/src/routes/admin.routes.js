const router = require("express").Router();
const controller = require("../controllers/admin.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireAdmin, requireSuperAdmin } = require("../middleware/adminAuth.middleware");

router.use(requireAuth, requireAdmin);
router.get("/dashboard", controller.dashboard);
router.get("/users", controller.listUsers);
router.patch("/users/:id/status", requireSuperAdmin, controller.setUserStatus);
router.get("/applications", controller.listApplications);
router.get("/applications/:id", controller.getApplication);
router.patch("/applications/:id/assign", controller.assignApplication);
router.post("/applications/:id/approve", controller.approveApplication);
router.post("/applications/:id/reject", controller.rejectApplication);
router.post("/certificates/:id/revoke", requireSuperAdmin, controller.revokeCertificate);
router.get("/audit-logs", controller.auditLogs);

module.exports = router;
