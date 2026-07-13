const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const healthController = require('../controllers/healthController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use('/oauth', authRoutes);
router.use('/api/user', authenticateToken, userRoutes);
router.get('/health', healthController.getHealth);
router.get('/protected', authenticateToken, healthController.getHealth);

module.exports = router;
