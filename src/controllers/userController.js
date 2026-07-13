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
    const { user_id, full_name, email, birthday, gender, device_id, device_info, avatar_base64, firebase_token } = req.body;

    if (user_id) {
        return exports.updateUser(req, res);
    }

    if (!full_name || !email || !birthday || !gender || !device_id) {
        return res.status(400).json({
            status: 400,
            error: 1,
            message: 'Missing required fields: full_name, email, birthday, gender, device_id',
            data: {},
        });
    }

    try {
        const newUser = await createUser({
            full_name,
            email,
            birthday,
            gender,
            device_id,
            device_info,
            avatar_base64,
            firebase_token,
        });

        return res.json({
            status: 200,
            error: 0,
            message: 'OK',
            data: newUser,
        });
    } catch (error) {
        if (error.code === 'DUPLICATE_EMAIL') {
            return res.status(409).json({
                status: 409,
                error: 1,
                message: 'Email already exists',
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
    const { user_id, full_name, email, birthday, gender, device_info, avatar_base64, firebase_token } = req.body;

    if (!user_id || !full_name || !email || !birthday || !gender) {
        return res.status(400).json({
            status: 400,
            error: 1,
            message: 'Missing required fields: user_id, full_name, email, birthday, gender',
            data: {},
        });
    }

    try {
        const updatedUser = await updateUser({
            user_id,
            full_name,
            email,
            birthday,
            gender,
            device_info,
            avatar_base64,
            firebase_token,
        });

        return res.json({
            status: 200,
            error: 0,
            message: 'OK',
            data: updatedUser,
        });
    } catch (error) {
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

        return res.json({
            status: 200,
            error: 0,
            message: 'OK',
            data: buildClientDisplayData(user),
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
