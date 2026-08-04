const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const healthController = require('../controllers/healthController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

const calendarRoutes = require('./calendarRoutes');
const aiRoutes = require('./aiRoutes');
const adminRoutes = require('./adminRoutes');
const divinationRoutes = require('./divinationRoutes');

router.use('/oauth', authRoutes);
router.use('/api/user', userRoutes);
router.use('/api/calendar', calendarRoutes);

router.use('/api/ai', aiRoutes);
router.use('/api/admin', adminRoutes);
router.use('/api/divination', divinationRoutes);


router.get('/health', healthController.getHealth);
router.get('/protected', authenticateToken, healthController.getHealth);

module.exports = router;

