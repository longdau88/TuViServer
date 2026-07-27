const cacheService = require('../services/cacheService');
const userCache = require('../services/userCache');
const { findUserByDeviceId, findUserById, createUser, updateUser, buildClientDisplayData } = require('../models/userModel');

exports.checkDeviceId = async (req, res) => {
    const deviceId = req.query.device_id;

    if (!deviceId) {
        return res.status(400).json({
            status: 400,
            error: 1,
            message: 'Missing device_id parameter',
            data: {},
        });
    }

    try {
        const startedAt = Date.now();
        const user = await findUserByDeviceId(deviceId);
        const durationMs = Date.now() - startedAt;
        if (durationMs > 1000) {
            console.warn(`checkDeviceId slow query: ${durationMs}ms`, { device_id: deviceId });
        }

        res.set('Cache-Control', 'private, max-age=60');
        return res.json({
            status: 200,
            error: 0,
            message: 'OK',
            data: user || {},
        });
    } catch (error) {
        console.error('checkDeviceId error:', error);
        return res.status(500).json({
            status: 500,
            error: 1,
            message: 'Internal Server Error',
            data: {},
        });
    }
};

exports.createUser = async (req, res) => {
    const { user_id, full_name, email, birthday, birth_time, gender, device_id, device_info, avatar_base64, avatar_url, firebase_token } = req.body;

    if (user_id) {
        return exports.updateUser(req, res);
    }

    if (!full_name || !email || !birthday || !birth_time || !gender || !device_id) {
        return res.status(400).json({
            status: 400,
            error: 1,
            message: 'Missing required fields: full_name, email, birthday, birth_time, gender, device_id',
            data: {},
        });
    }

    try {
        const newUser = await createUser({
            full_name,
            email,
            birthday,
            birth_time,
            gender,
            device_id,
            device_info,
            avatar_base64,
            avatar_url,
            firebase_token,
        });

        return res.json({
            status: 200,
            error: 0,
            message: 'OK',
            data: newUser,
        });
    } catch (error) {
        if (error.code === 'INVALID_BIRTH_DATA') {
            return res.status(400).json({
                status: 400,
                error: 1,
                message: 'Invalid birthday or birth_time',
                data: {},
            });
        }

        if (error.code === 'DUPLICATE_EMAIL') {
            return res.status(409).json({
                status: 409,
                error: 1,
                message: 'Email already exists',
                data: {},
            });
        }

        if (error.code === 'AVATAR_UPLOAD_FAILED') {
            return res.status(error.status || 502).json({
                status: error.status || 502,
                error: 1,
                message: error.message || 'Failed to upload avatar',
                data: {},
            });
        }

        if (error.code === 'IMGBB_NOT_CONFIGURED') {
            return res.status(error.status || 503).json({
                status: error.status || 503,
                error: 1,
                message: 'Avatar upload service is not configured',
                data: {},
            });
        }

        console.error('createUser error:', error);
        return res.status(500).json({
            status: 500,
            error: 1,
            message: 'Internal Server Error',
            data: {},
        });
    }
};

exports.updateUser = async (req, res) => {
    const { user_id, full_name, email, birthday, birth_time, gender, device_info, avatar_base64, avatar_url, firebase_token } = req.body;

    if (!user_id || !full_name || !email || !birthday || !birth_time || !gender) {
        return res.status(400).json({
            status: 400,
            error: 1,
            message: 'Missing required fields: user_id, full_name, email, birthday, birth_time, gender',
            data: {},
        });
    }

    try {
        const updatedUser = await updateUser({
            user_id,
            full_name,
            email,
            birthday,
            birth_time,
            gender,
            device_info,
            avatar_base64,
            avatar_url,
            firebase_token,
        });

        return res.json({
            status: 200,
            error: 0,
            message: 'OK',
            data: updatedUser,
        });
    } catch (error) {
        if (error.code === 'INVALID_BIRTH_DATA') {
            return res.status(400).json({
                status: 400,
                error: 1,
                message: 'Invalid birthday or birth_time',
                data: {},
            });
        }

        if (error.code === 'DUPLICATE_EMAIL') {
            return res.status(409).json({
                status: 409,
                error: 1,
                message: 'Email already exists',
                data: {},
            });
        }

        if (error.code === 'USER_NOT_FOUND') {
            return res.status(404).json({
                status: 404,
                error: 1,
                message: 'User not found',
                data: {},
            });
        }

        if (error.code === 'INVALID_USER_ID') {
            return res.status(400).json({
                status: 400,
                error: 1,
                message: 'Invalid user_id',
                data: {},
            });
        }

        if (error.code === 'AVATAR_UPLOAD_FAILED') {
            return res.status(error.status || 502).json({
                status: error.status || 502,
                error: 1,
                message: error.message || 'Failed to upload avatar',
                data: {},
            });
        }

        if (error.code === 'IMGBB_NOT_CONFIGURED') {
            return res.status(error.status || 503).json({
                status: error.status || 503,
                error: 1,
                message: 'Avatar upload service is not configured',
                data: {},
            });
        }

        console.error('updateUser error:', error);
        return res.status(500).json({
            status: 500,
            error: 1,
            message: 'Internal Server Error',
            data: {},
        });
    }
};

exports.getProfileDisplay = async (req, res) => {
    const userId = Number(req.query.user_id);

    if (!userId || Number.isNaN(userId) || userId <= 0) {
        return res.status(400).json({
            status: 400,
            error: 1,
            message: 'Missing or invalid user_id parameter',
            data: {},
        });
    }

    try {
        const user = await findUserById(userId);

        if (!user) {
            return res.status(404).json({
                status: 404,
                error: 1,
                message: 'User not found',
                data: {},
            });
        }

        if (!user.birth_time) {
            return res.status(422).json({
                status: 422,
                error: 1,
                message: 'User must provide birth_time before a Tử Vi chart can be calculated',
                data: {},
            });
        }

        const displayData = await cacheService.getOrSet(
            userCache.keys.profileDisplay(userId),
            userCache.displayTtl(),
            () => buildClientDisplayData(user),
        );

        res.set('Cache-Control', 'private, max-age=120');
        return res.json({
            status: 200,
            error: 0,
            message: 'OK',
            data: displayData,
        });
    } catch (error) {
        console.error('getProfileDisplay error:', error);
        return res.status(500).json({
            status: 500,
            error: 1,
            message: 'Internal Server Error',
            data: {},
        });
    }
};
