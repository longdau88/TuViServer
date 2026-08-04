const express = require('express');
const router = express.Router();
const divinationController = require('../controllers/divinationController');

// Allow optional token authentication if available
const parseTokenIfPresent = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const jwt = require('jsonwebtoken');
        const token = authHeader.slice(7);
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
            req.user = decoded;
        } catch (err) {
            // Ignore invalid token, treat as guest/device
        }
    }
    next();
};

router.use(parseTokenIfPresent);

// Draw Daily Divination (POST /api/divination/draw)
router.post('/draw', divinationController.drawDaily);

// Get User Draw History (GET /api/divination/history)
router.get('/history', divinationController.getHistory);

// Get All 64 Hexagrams (GET /api/divination/hexagrams)
router.get('/hexagrams', divinationController.getAllHexagrams);

module.exports = router;
