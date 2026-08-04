const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { heavyReadLimiter } = require('../middleware/rateLimitMiddleware');
const { authenticateToken } = require('../middleware/authMiddleware');

const compatibilityController = require('../controllers/compatibilityController');
const realtimeHoroscopeController = require('../controllers/realtimeHoroscopeController');

router.get('/check-device', userController.checkDeviceId);
router.get('/check-device_id', userController.checkDeviceId);
router.get('/la-so-tu-vi', heavyReadLimiter, userController.getProfileDisplay);
router.post('/create', userController.createUser);
router.post('/update-user', userController.updateUser);
router.post('/compatibility', heavyReadLimiter, compatibilityController.getCompatibilityAnalysis);
router.post('/realtime-horoscope', heavyReadLimiter, realtimeHoroscopeController.getRealtimeHoroscope);
router.get('/realtime-horoscope', heavyReadLimiter, realtimeHoroscopeController.getRealtimeHoroscope);
router.get('/packages', userController.getPublicPackagesController);


// New route for clearing all cache (protected)
router.post('/cache/clear-all', authenticateToken, userController.clearAllCache);

module.exports = router;
