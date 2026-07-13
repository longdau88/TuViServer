const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/token', authController.getToken);
router.get('/web-token', authController.getWebToken);

module.exports = router;
