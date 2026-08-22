const router = require("express").Router();
const controller = require("../controllers/application.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { applicationUpload } = require("../middleware/upload.middleware");
const { validateCreateApplication } = require("../validations/application.validation");

router.use(requireAuth);
router.post("/", applicationUpload, validateCreateApplication, controller.submitApplication);
router.get("/", controller.getMyApplications);
router.get("/:id", controller.getById);
router.put("/:id", controller.updateApplication);
router.post("/:id/submit", controller.submitDraft);
router.get("/:id/status", controller.getStatus);
router.delete("/:id", controller.deleteApplication);

module.exports = router;
