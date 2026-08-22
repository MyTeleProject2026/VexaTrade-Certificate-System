const router = require("express").Router();
const controller = require("../controllers/notification.controller");
const { requireAuth } = require("../middleware/auth.middleware");

router.use(requireAuth);
router.get("/", controller.list);
router.get("/unread", controller.unread);
router.patch("/:id/read", controller.markRead);
router.patch("/read-all", controller.markAllRead);

module.exports = router;
