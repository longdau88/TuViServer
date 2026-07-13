const { findUserByDeviceId, createUser } = require('../models/userModel');

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
    const { full_name, email, birthday, gender, device_id, device_info, firebase_token } = req.body;

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
