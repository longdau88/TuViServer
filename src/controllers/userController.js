const pool = require('../config/db');
const cacheService = require('../services/cacheService');
const userCache = require('../services/userCache');
const { findUserByDeviceId, findUserById, findUserByEmail } = require('../models/userModel');
const { createUser, updateUser } = require('../services/userService');
const { buildClientDisplayData } = require('../services/displayService');
const { verifyPassword } = require('../utils/hashUtils');
const jwt = require('jsonwebtoken');

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

        // No browser cache - always get fresh data so deleted users see create screen immediately
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.set('Pragma', 'no-cache');
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
            password: req.body.password,
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
    const { user_id, full_name, email, birthday, birth_time, gender, device_info, avatar_base64, avatar_url, firebase_token, password } = req.body;

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
            password,
            device_info,
            avatar_base64,
            avatar_url,
            firebase_token,
        });

        // Invalidate the cache for this user
        const finalUserId = updatedUser && (updatedUser.id || updatedUser.user_id);
        if (finalUserId) {
            const cacheKey = userCache.keys.profileDisplay(finalUserId);
            await cacheService.del(cacheKey);
            console.log(`[Cache] Cleared cache for user_id: ${finalUserId}`);
        }

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

exports.logoutUserDevice = async (req, res) => {
    const userId = Number(req.body?.user_id);
    const deviceId = req.body?.device_id || req.headers['x-device-id'] || req.query.device_id;

    if (!userId || Number.isNaN(userId) || userId <= 0) {
        return res.status(400).json({
            status: 400,
            error: 1,
            message: 'Missing or invalid user_id',
            data: {},
        });
    }

    if (!deviceId) {
        return res.status(400).json({
            status: 400,
            error: 1,
            message: 'Missing device_id',
            data: {},
        });
    }

    try {
        const [result] = await pool.query(
            `UPDATE users SET device_id = NULL WHERE id = ? AND device_id = ?`,
            [userId, deviceId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                status: 404,
                error: 1,
                message: 'Không tìm thấy tài khoản đang liên kết với thiết bị này',
                data: {},
            });
        }

        const cacheKeys = [
            userCache.keys.userById(userId),
            userCache.keys.userByDevice(deviceId),
            userCache.keys.profileDisplay(userId),
        ];
        await Promise.all(cacheKeys.map((key) => cacheService.del(key).catch(() => null)));

        return res.json({
            status: 200,
            error: 0,
            message: 'Đăng xuất thành công',
            data: {},
        });
    } catch (error) {
        console.error('logoutUserDevice error:', error);
        return res.status(500).json({
            status: 500,
            error: 1,
            message: 'Lỗi máy chủ khi đăng xuất',
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

exports.clearAllCache = async (req, res) => {
    try {
        await cacheService.clearAll();
        return res.status(200).json({
            status: 200,
            error: 0,
            message: 'All caches cleared successfully.',
            data: {},
        });
    } catch (error) {
        console.error('clearAllCache error:', error);
        return res.status(500).json({
            status: 500,
            error: 1,
            message: 'Internal Server Error while clearing cache.',
            data: {},
        });
    }
};

exports.getPublicPackagesController = async (req, res) => {
    try {
        let rows = [];
        try {
            const [dbRows] = await pool.query(`SELECT * FROM vip_packages ORDER BY price ASC`);
            rows = dbRows;
        } catch (dbErr) { }

        if (!rows || rows.length === 0) {
            rows = [
                {
                    id: 1,
                    code: 'vip_1m',
                    name: 'Gói VIP 1 Tháng',
                    price: 99000,
                    duration_days: 30,
                    is_popular: false,
                    features: ['Trò chuyện Trợ lý AI không giới hạn', 'Xem trọn bộ 12 Cung Lá số Tử Vi', 'Xem Lịch ngày tốt xấu chi tiết', 'Bốc quẻ & Lưu lịch sử trọn đời']
                },
                {
                    id: 2,
                    code: 'vip_6m',
                    name: 'Gói VIP 6 Tháng (Tiết Kiệm 25%)',
                    price: 449000,
                    duration_days: 180,
                    is_popular: true,
                    features: ['Tất cả đặc quyền Gói VIP 1 Tháng', 'Ưu tiên phản hồi AI tốc độ cao', 'Phân tích lá số tử vi chuyên sâu', 'Tặng 1 lượt xem phong thủy gia đạo']
                },
                {
                    id: 3,
                    code: 'vip_1y',
                    name: 'Gói VIP 1 Năm (Tiết Kiệm 40%)',
                    price: 699000,
                    duration_days: 365,
                    is_popular: false,
                    features: ['Tất cả đặc quyền Gói VIP 6 Tháng', 'Hỏi đáp AI không giới hạn cả năm', 'Tự động nhắc lịch Hoàng Đạo/Vận Hạn', 'Xuất File Lá số Tử Vi HD & PDF']
                },
                {
                    id: 4,
                    code: 'vip_lifetime',
                    name: 'Gói VIP Trọn Đời (Đặc Quyền Vô Hạn)',
                    price: 1499000,
                    duration_days: 36500,
                    is_popular: false,
                    features: ['Sử dụng Trọn Đời tất cả tính năng', 'Không giới hạn lượt hỏi AI vĩnh viễn', 'Mở khóa 100% tính năng mới tương lai', 'Huy hiệu VIP Kim Cương chính chủ']
                }
            ];
        }

        res.set('Cache-Control', 'public, max-age=300');
        return res.json({
            status: 200,
            error: 0,
            message: 'OK',
            data: rows
        });
    } catch (err) {
        console.error('getPublicPackagesController error:', err);
        return res.status(500).json({ status: 500, error: 1, message: 'Lỗi lấy danh sách gói cước' });
    }
};

exports.loginUserController = async (req, res) => {
    try {
        const { email, password, device_id } = req.body || {};
        const deviceId = device_id || req.headers['x-device-id'] || req.query.device_id;

        if (!email || !password) {
            return res.status(400).json({ status: 400, error: 1, message: 'Vui lòng nhập Email và Mật khẩu' });
        }

        const normalizedEmail = String(email).trim();
        const user = await findUserByEmail(normalizedEmail);

        if (!user || !user.password_hash) {
            return res.status(401).json({ status: 401, error: 1, message: 'Email hoặc Mật khẩu không chính xác!' });
        }

        const isValid = verifyPassword(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ status: 401, error: 1, message: 'Email hoặc Mật khẩu không chính xác!' });
        }

        // UPDATE device_id of the logged in user to the current device's device_id!
        if (deviceId) {
            await pool.query(`UPDATE users SET device_id = ? WHERE id = ?`, [deviceId, user.id]);
            await userCache.invalidateUser(user.id, deviceId);
        }

        const tokenSecret = process.env.JWT_SECRET || 'secret';
        const token = jwt.sign(
            { id: user.id, sub: user.email, name: user.full_name, role: user.role || 'user' },
            tokenSecret,
            { expiresIn: '30d', algorithm: 'HS256' }
        );

        const updatedUserProfile = await findUserById(user.id);
        // Strip password_hash before sending to client
        if (updatedUserProfile && updatedUserProfile.password_hash) {
            delete updatedUserProfile.password_hash;
        }

        return res.json({
            status: 200,
            error: 0,
            message: 'Đăng nhập thành công!',
            data: {
                token,
                access_token: token,
                user: updatedUserProfile
            }
        });
    } catch (err) {
        console.error('loginUserController error:', err);
        return res.status(500).json({ status: 500, error: 1, message: 'Lỗi máy chủ khi đăng nhập' });
    }
};


