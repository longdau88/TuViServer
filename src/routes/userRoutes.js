const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/check-device_id', userController.checkDeviceId);
router.get('/la-so-tu-vi', userController.getProfileDisplay);
router.post('/create', userController.createUser);

module.exports = router;
