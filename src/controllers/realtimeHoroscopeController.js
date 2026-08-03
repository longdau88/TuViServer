const realtimeHoroscopeService = require('../services/realtimeHoroscopeService');
const cacheService = require('../services/cacheService');
const { findUserByDeviceId, findUserById } = require('../models/userModel');
const { formatDateToYMD } = require('../utils/dateUtils');

/**
 * Controller: Get Real-time Horoscope Forecast (Tử Vi Realtime Hôm Nay / Tháng Này / Năm Này)
 */
exports.getRealtimeHoroscope = async (req, res) => {
    try {
        const body = req.body || {};
        const query = req.query || {};

        // Parse target_date (default to today if missing)
        let targetDateStr = body.target_date || query.target_date;
        if (!targetDateStr) {
            targetDateStr = formatDateToYMD(new Date());
        }

        // Resolve user profile
        let personInput = null;

        if (body.birthday && body.birth_time && body.gender) {
            personInput = {
                full_name: body.full_name || query.full_name || 'Người dùng',
                birthday: body.birthday,
                birth_time: body.birth_time,
                gender: body.gender,
            };
        } else {
            const userId = body.user_id || query.user_id;
            const deviceId = body.device_id || query.device_id;

            let dbUser = null;
            if (userId) {
                dbUser = await findUserById(userId);
            } else if (deviceId) {
                dbUser = await findUserByDeviceId(deviceId);
            }

            if (dbUser && dbUser.birthday && dbUser.birth_time && dbUser.gender) {
                personInput = {
                    full_name: dbUser.full_name || 'Người dùng',
                    birthday: dbUser.birthday,
                    birth_time: dbUser.birth_time,
                    gender: dbUser.gender,
                };
            }
        }

        if (!personInput) {
            return res.status(400).json({
                status: 400,
                error: 1,
                message: 'Thiếu thông tin cá nhân (bắt buộc: birthday, birth_time, gender hoặc user_id/device_id)',
                data: {},
            });
        }

        // Cache Key construction
        const cacheKeyParts = [
            personInput.full_name, personInput.birthday, personInput.birth_time, personInput.gender,
            targetDateStr,
        ].join(':');

        const cacheKey = `realtime_horoscope_v2:${Buffer.from(cacheKeyParts).toString('base64').substring(0, 64)}`;

        // Check Redis Cache
        const cachedData = await cacheService.get(cacheKey);
        if (cachedData !== undefined) {
            res.set('Cache-Control', 'private, max-age=300');
            return res.json({
                status: 200,
                error: 0,
                message: 'OK (cached)',
                data: cachedData,
            });
        }

        // Compute real-time forecast
        const forecast = realtimeHoroscopeService.generateRealtimeForecast(personInput, targetDateStr);

        // Store to cache (TTL: 30 minutes)
        await cacheService.set(cacheKey, forecast, 1800);

        res.set('Cache-Control', 'private, max-age=300');
        return res.json({
            status: 200,
            error: 0,
            message: 'OK',
            data: forecast,
        });
    } catch (error) {
        console.error('getRealtimeHoroscope error:', error);
        return res.status(500).json({
            status: 500,
            error: 1,
            message: 'Lỗi server khi tính toán vận hạn thời gian thực',
            data: {},
        });
    }
};
