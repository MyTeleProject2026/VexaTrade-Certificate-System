const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const auth = require('../middleware/auth.middleware');
router.post('/sso-login', authController.ssoLogin);
router.get('/me', auth, authController.getMe);
router.post('/logout', auth, authController.logout);
module.exports = router;