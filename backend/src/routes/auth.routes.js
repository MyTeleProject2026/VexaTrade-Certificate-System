const router = require("express").Router();
const controller = require("../controllers/auth.controller");
const { requireAuth } = require("../middleware/auth.middleware");

router.post("/register", controller.createLocalUser);
router.post("/login", controller.localLogin);
router.post("/sso", controller.ssoLogin);
router.post("/refresh", controller.refreshToken);
router.post("/logout", requireAuth, controller.logout);
router.get("/me", requireAuth, controller.getMe);
router.post("/change-password", requireAuth, controller.changePassword);

module.exports = router;
