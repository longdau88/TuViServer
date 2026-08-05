const compatibilityService = require('../services/compatibilityService');
const cacheService = require('../services/cacheService');
const { findUserByDeviceId, findUserById } = require('../models/userModel');

/**
 * Helper to resolve profile input from payload or database
 */
const resolvePersonInput = async (personData, prefix = '') => {
    if (!personData) return null;

    // If direct profile provided
    if (personData.birthday && personData.birth_time && personData.gender) {
        return {
            full_name: personData.full_name || 'Người dùng',
            birthday: personData.birthday,
            birth_time: personData.birth_time,
            gender: personData.gender,
        };
    }

    // If user_id or device_id provided
    const userId = personData.user_id || personData.id;
    const deviceId = personData.device_id;

    let dbUser = null;
    if (userId) {
        dbUser = await findUserById(userId);
    } else if (deviceId) {
        dbUser = await findUserByDeviceId(deviceId);
    }

    if (dbUser && dbUser.birthday && dbUser.birth_time && dbUser.gender) {
        return {
            full_name: dbUser.full_name || 'Người dùng',
            birthday: dbUser.birthday,
            birth_time: dbUser.birth_time,
            gender: dbUser.gender,
        };
    }

    return null;
};

/**
 * Controller: Get Compatibility Analysis (Tử Vi Đôi / Hợp Tuổi)
 */
exports.getCompatibilityAnalysis = async (req, res) => {
    try {
        const body = req.body || {};

        // Parse Person 1 input
        const person1Raw = body.person_1 || {
            full_name: body.person1_full_name || body.full_name_1,
            birthday: body.person1_birthday || body.birthday_1,
            birth_time: body.person1_birth_time || body.birth_time_1,
            gender: body.person1_gender || body.gender_1,
            user_id: body.person1_user_id || body.user_id_1,
            device_id: body.person1_device_id || body.device_id_1,
        };

        // Parse Person 2 input
        const person2Raw = body.person_2 || {
            full_name: body.person2_full_name || body.full_name_2,
            birthday: body.person2_birthday || body.birthday_2,
            birth_time: body.person2_birth_time || body.birth_time_2,
            gender: body.person2_gender || body.gender_2,
            user_id: body.person2_user_id || body.user_id_2,
            device_id: body.person2_device_id || body.device_id_2,
        };

        const relationshipType = body.relationship_type || 'vo_chong';

        const person1 = await resolvePersonInput(person1Raw);
        const person2 = await resolvePersonInput(person2Raw);

        if (!person1) {
            return res.status(400).json({
                status: 400,
                error: 1,
                message: 'Thiếu thông tin người thứ nhất (bắt buộc: birthday, birth_time, gender)',
                data: {},
            });
        }

        if (!person2) {
            return res.status(400).json({
                status: 400,
                error: 1,
                message: 'Thiếu thông tin người thứ hai (bắt buộc: birthday, birth_time, gender)',
                data: {},
            });
        }

        // Cache Key construction
        const cacheKeyParts = [
            person1.full_name, person1.birthday, person1.birth_time, person1.gender,
            person2.full_name, person2.birthday, person2.birth_time, person2.gender,
        ].join(':');

        const cacheKey = `compatibility_v3:${Buffer.from(cacheKeyParts).toString('base64').substring(0, 64)}`;

        // Try getting from cache
        const cachedData = await cacheService.get(cacheKey);
        if (cachedData !== undefined) {
            res.set('Cache-Control', 'no-store');
            return res.json({
                status: 200,
                error: 0,
                message: 'OK (cached)',
                data: cachedData,
            });
        }

        // Compute full compatibility analysis
        const result = compatibilityService.calculateCompatibility(person1, person2);

        // Store to cache (TTL: 1 hour)
        await cacheService.set(cacheKey, result, 3600);

        res.set('Cache-Control', 'no-store');
        return res.json({
            status: 200,
            error: 0,
            message: 'OK',
            data: result,
        });
    } catch (error) {
        console.error('getCompatibilityAnalysis error:', error);
        return res.status(500).json({
            status: 500,
            error: 1,
            message: 'Lỗi server khi phân tích độ hợp tuổi',
            data: {},
        });
    }
};
