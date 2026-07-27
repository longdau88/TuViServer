const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimitMiddleware');

router.post('/token', authLimiter, authController.getToken);
router.get('/web-token', authLimiter, authController.getWebToken);

module.exports = router;
