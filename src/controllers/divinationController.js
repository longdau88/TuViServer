const divinationService = require('../services/divinationService');
const { findUserById, findUserByDeviceId } = require('../models/userModel');

/**
 * Draw daily hexagram for user
 * POST /api/divination/draw
 */
exports.drawDaily = async (req, res) => {
    try {
        const body = req.body || {};
        let user_id = req.user ? req.user.id : (body.user_id || null);
        let device_id = body.device_id || (req.headers['x-device-id'] || null);

        // Fetch user from DB if ID is passed
        let userProfile = null;
        if (user_id) {
            userProfile = await findUserById(user_id);
        } else if (device_id) {
            userProfile = await findUserByDeviceId(device_id);
        }

        const result = await divinationService.drawDailyDivination({
            user_id: userProfile ? userProfile.id : user_id,
            device_id,
            userProfile
        });

        return res.json({
            status: 200,
            error: 0,
            message: result.message,
            data: result
        });
    } catch (err) {
        console.error('divination drawDaily error:', err);
        return res.status(500).json({ status: 500, error: 1, message: 'Lỗi máy chủ khi gieo quẻ hằng ngày' });
    }
};

/**
 * Get user draw history
 * GET /api/divination/history
 */
exports.getHistory = async (req, res) => {
    try {
        const user_id = req.user ? req.user.id : (req.query.user_id || null);
        const device_id = req.query.device_id || (req.headers['x-device-id'] || null);
        const limit = Number(req.query.limit) || 20;
        const offset = Number(req.query.offset) || 0;

        const history = await divinationService.getUserDivinationHistory({ user_id, device_id, limit, offset });

        return res.json({
            status: 200,
            error: 0,
            message: 'OK',
            data: history
        });
    } catch (err) {
        console.error('divination getHistory error:', err);
        return res.status(500).json({ status: 500, error: 1, message: 'Lỗi lấy lịch sử bốc quẻ' });
    }
};

/**
 * Get all 64 hexagrams reference
 * GET /api/divination/hexagrams
 */
exports.getAllHexagrams = (req, res) => {
    const list = divinationService.getAllHexagrams();
    return res.json({
        status: 200,
        error: 0,
        message: 'OK',
        data: list
    });
};
