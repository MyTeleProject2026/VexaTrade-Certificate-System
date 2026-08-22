const router = require("express").Router();
const controller = require("../controllers/certificate.controller");
const { requireAuth } = require("../middleware/auth.middleware");

router.get("/verify/:code", controller.verify);
router.get("/", requireAuth, controller.listMyCertificates);
router.get("/:id", requireAuth, controller.getCertificate);
router.get("/:id/download", requireAuth, controller.download);

module.exports = router;
