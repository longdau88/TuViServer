const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { heavyReadLimiter } = require('../middleware/rateLimitMiddleware');

router.get('/check-device', userController.checkDeviceId);
router.get('/check-device_id', userController.checkDeviceId);
router.get('/la-so-tu-vi', heavyReadLimiter, userController.getProfileDisplay);
router.post('/create', userController.createUser);
router.post('/update-user', userController.updateUser);

module.exports = router;
