/**
 * VIP Access Control Middleware
 * Middleware kiểm soát phân quyền tính năng Miễn Phí (Free) vs Trả Phí (VIP)
 */

const { findUserById, findUserByDeviceId } = require('../models/userModel');

/**
 * Helper to check if user has active VIP status
 */
const isVipUser = (user) => {
    if (!user) return false;
    // Admin always has full access
    if (user.role === 'admin') return true;
    // Check is_vip boolean field (returned by formatUserRow from DB)
    if (!user.is_vip) return false;

    // Check expiration date if present (null/undefined = lifetime VIP)
    if (user.vip_expires_at) {
        const expiresDate = new Date(user.vip_expires_at);
        if (expiresDate < new Date()) {
            return false; // Expired VIP - no auto renew
        }
    }
    return true;
};


/**
 * Middleware: Require Active VIP Membership
 */
const requireVip = (featureName = 'tính năng này') => {
    return async (req, res, next) => {
        try {
            let user = req.user || null;
            const deviceId = req.headers['x-device-id'] || req.query.device_id || req.body.device_id;

            if (!user && deviceId) {
                user = await findUserByDeviceId(deviceId);
            }

            if (isVipUser(user)) {
                req.is_vip = true;
                return next();
            }

            // User is Free or Expired VIP -> Return 403 Forbidden with VIP Upsell Metadata
            const isExpired = user && user.vip_expires_at && new Date(user.vip_expires_at) < new Date();
            const msg = isExpired
                ? 'Gói cước VIP của bạn đã hết hạn (Hệ thống KHÔNG tự động gia hạn). Vui lòng chọn và thanh toán gói cước mới để tiếp tục sử dụng!'
                : `Tài khoản Miễn Phí bị giới hạn. Vui lòng nâng cấp Gói Cước VIP để sử dụng trọn vẹn ${featureName}!`;

            return res.status(403).json({
                status: 403,
                error: 1,
                code: 'VIP_REQUIRED',
                is_vip_required: true,
                is_expired: isExpired,
                auto_renew: false,
                message: msg,
                upgrade_url: '/goi-cuoc.html',
                feature: featureName
            });
        } catch (err) {

            console.error('VIP Middleware Error:', err);
            return next();
        }
    };
};

/**
 * Soft Middleware: Attach VIP status flag to request without blocking
 */
const checkVipStatusSoft = async (req, res, next) => {
    try {
        let user = req.user || null;
        const deviceId = req.headers['x-device-id'] || req.query.device_id || req.body.device_id;

        if (!user && deviceId) {
            user = await findUserByDeviceId(deviceId);
        }

        req.is_vip = isVipUser(user);
    } catch (err) {
        req.is_vip = false;
    }
    next();
};

module.exports = {
    isVipUser,
    requireVip,
    checkVipStatusSoft
};
