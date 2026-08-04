const { getAllUsers, getUsersByRole, createUserAccount, updateUserAccount, deleteUserAccount, updateUserRole, updateUserVip, getAdminStats, getVipPackageUsageStats, getAllTransactions, updateTransactionStatus, deleteTransaction } = require('../models/userModel');


const aiKnowledgeService = require('../services/aiKnowledgeService');
const cacheService = require('../services/cacheService');
const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { verifyPassword } = require('../utils/hashUtils');

dotenv.config();

exports.clearAllCache = async (req, res) => {
    try {
        await cacheService.clearAll();
        return res.json({ status: 200, error: 0, message: 'Đã xóa sạch toàn bộ Cache hệ thống (Redis) thành công!' });
    } catch (err) {
        console.error('admin clearAllCache error:', err);
        return res.status(500).json({ status: 500, error: 1, message: 'Lỗi khi xóa cache hệ thống' });
    }
};



/**
 * Admin Login Authentication (Strictly Database Verified)
 */
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body || {};

        if (!username || !password) {
            return res.status(400).json({ status: 400, error: 1, message: 'Vui lòng nhập Email/Tên đăng nhập và Mật khẩu' });
        }

        const inputUser = String(username).trim();

        // Fetch admin user strictly from Database
        const [users] = await pool.query(
            `SELECT id, full_name, email, role, password_hash FROM users WHERE (email = ? OR full_name = ? OR email LIKE ?) AND role = 'admin' LIMIT 1`,
            [inputUser, inputUser, `${inputUser}%`]
        );

        if (users.length === 0) {
            return res.status(401).json({ status: 401, error: 1, message: 'Tài khoản Admin không tồn tại trong hệ thống!' });
        }


        const adminUser = users[0];
        const isPasswordValid = verifyPassword(password, adminUser.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({ status: 401, error: 1, message: 'Mật khẩu Admin không chính xác!' });
        }

        const tokenSecret = process.env.JWT_SECRET;
        const token = jwt.sign(
            { id: adminUser.id, sub: adminUser.email, role: 'admin', name: adminUser.full_name },
            tokenSecret,
            { expiresIn: '7d', algorithm: 'HS256' }
        );

        return res.json({
            status: 200,
            error: 0,
            message: 'Đăng nhập Admin thành công!',
            data: {
                token,
                user: { id: adminUser.id, email: adminUser.email, name: adminUser.full_name, role: 'admin' }
            }
        });
    } catch (err) {
        console.error('admin login error:', err);
        return res.status(500).json({ status: 500, error: 1, message: 'Lỗi máy chủ khi đăng nhập Admin' });
    }
};


/**
 * Get dashboard statistics
 */
exports.getStats = async (req, res) => {
    try {
        const stats = await getAdminStats();
        const vipPackageUsage = await getVipPackageUsageStats();
        const knowledgeList = aiKnowledgeService.getAllKnowledge();

        return res.json({
            status: 200,
            error: 0,
            message: 'OK',
            data: {
                ...stats,
                vipPackageUsage,
                totalKnowledge: knowledgeList.length,
            }
        });
    } catch (err) {
        console.error('admin getStats error:', err);
        return res.status(500).json({ status: 500, error: 1, message: 'Lỗi lấy thống kê admin' });
    }
};

/**
 * Get user list filtered by role (user/admin) with pagination and search
 */
exports.getUsers = async (req, res) => {
    try {
        const role = req.query.role || '';
        const search = req.query.search || '';
        const limit = Number(req.query.limit) || 50;
        const offset = Number(req.query.offset) || 0;

        let result;
        if (role) {
            result = await getUsersByRole(role, search, limit, offset);
        } else {
            result = await getAllUsers(search, limit, offset);
        }

        return res.json({
            status: 200,
            error: 0,
            message: 'OK',
            data: result
        });
    } catch (err) {
        console.error('admin getUsers error:', err);
        return res.status(500).json({ status: 500, error: 1, message: 'Lỗi lấy danh sách người dùng' });
    }
};

/**
 * Create a new User or Admin account
 */
exports.createUser = async (req, res) => {
    try {
        const { full_name, email, password, role, gender, is_vip, ai_quota } = req.body || {};
        if (!full_name || !email) {
            return res.status(400).json({ status: 400, error: 1, message: 'Vui lòng nhập Họ tên và Email' });
        }

        await createUserAccount({
            full_name,
            email,
            password: password || '123456',
            role: role || 'user',
            gender,
            is_vip: Boolean(is_vip),
            ai_quota: ai_quota !== undefined ? Number(ai_quota) : 5
        });

        // Auto clear system cache on mutation
        await cacheService.clearAll();

        return res.json({
            status: 200,
            error: 0,
            message: `Tạo tài khoản ${role === 'admin' ? 'Admin' : 'Người dùng'} mới thành công!`,
            data: {}
        });
    } catch (err) {
        console.error('admin createUser error:', err);
        return res.status(err.status || 500).json({ status: err.status || 500, error: 1, message: err.message || 'Lỗi tạo tài khoản mới' });
    }
};

/**
 * Update User or Admin account details
 */
exports.updateUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const userData = req.body || {};
        await updateUserAccount(userId, userData);
        await cacheService.clearAll();
        return res.json({ status: 200, error: 0, message: 'Cập nhật tài khoản thành công!' });
    } catch (err) {
        console.error('admin updateUser error:', err);
        return res.status(500).json({ status: 500, error: 1, message: 'Lỗi cập nhật tài khoản' });
    }
};

/**
 * Delete User or Admin account
 */
exports.deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;
        // Don't allow deleting self if same id
        if (req.user && String(req.user.id) === String(userId)) {
            return res.status(400).json({ status: 400, error: 1, message: 'Bạn không thể tự xóa tài khoản Admin đang đăng nhập!' });
        }
        await deleteUserAccount(userId);
        await cacheService.clearAll();
        return res.json({ status: 200, error: 0, message: 'Đã xóa tài khoản thành công!' });
    } catch (err) {
        console.error('admin deleteUser error:', err);
        return res.status(500).json({ status: 500, error: 1, message: 'Lỗi xóa tài khoản' });
    }
};

/**
 * Update user role (user/admin)
 */
exports.updateRole = async (req, res) => {
    try {
        const userId = req.params.id;
        const { role } = req.body;
        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ status: 400, error: 1, message: 'Role không hợp lệ' });
        }
        await updateUserRole(userId, role);
        await cacheService.clearAll();
        return res.json({ status: 200, error: 0, message: 'Cập nhật quyền thành công' });
    } catch (err) {
        console.error('admin updateRole error:', err);
        return res.status(500).json({ status: 500, error: 1, message: 'Lỗi cập nhật quyền user' });
    }
};

/**
 * Update user VIP status and quota
 */
exports.updateVip = async (req, res) => {
    try {
        const userId = req.params.id;
        const { is_vip, days, quota, package_code } = req.body || {};

        let resolvedDays = Number(days || 30);
        let resolvedQuota = Number(quota || 100);
        let resolvedPackageCode = package_code || null;
        let resolvedPackageName = null;

        if (resolvedPackageCode) {
            const [packages] = await pool.query(
                `SELECT code, name, duration_days, ai_quota FROM vip_packages WHERE code = ? LIMIT 1`,
                [resolvedPackageCode]
            );

            if (packages.length === 0) {
                return res.status(404).json({ status: 404, error: 1, message: 'Không tìm thấy gói cước đã chọn' });
            }

            resolvedPackageCode = packages[0].code;
            resolvedPackageName = packages[0].name || null;
            resolvedDays = Number(packages[0].duration_days || resolvedDays || 30);
            resolvedQuota = Number(packages[0].ai_quota || resolvedQuota || 100);
        }

        const shouldActivateVip = Boolean(resolvedPackageCode) || Number(is_vip) === 1 || is_vip === true;
        await updateUserVip(userId, shouldActivateVip, resolvedDays, resolvedQuota, resolvedPackageCode, resolvedPackageName);
        await cacheService.clearAll();
        return res.json({ status: 200, error: 0, message: 'Cập nhật VIP & Quota thành công' });
    } catch (err) {
        console.error('admin updateVip error:', err);
        return res.status(500).json({ status: 500, error: 1, message: 'Lỗi cập nhật trạng thái VIP' });
    }
};

/**
 * VIP Packages Management
 */
exports.getPackages = async (req, res) => {
    try {
        const [rows] = await pool.query(`SELECT * FROM vip_packages ORDER BY price ASC`);
        return res.json({ status: 200, error: 0, data: rows });
    } catch (err) {
        return res.status(500).json({ status: 500, error: 1, message: 'Lỗi lấy danh sách gói cước' });
    }
};

exports.createPackage = async (req, res) => {
    try {
        const { code, name, price, duration_days, ai_quota, description } = req.body;
        if (!code || !name || price === undefined) {
            return res.status(400).json({ status: 400, error: 1, message: 'Thiếu thông tin gói cước (code, name, price)' });
        }
        await pool.query(
            `INSERT INTO vip_packages (code, name, price, duration_days, ai_quota, description) VALUES (?, ?, ?, ?, ?, ?)`,
            [code, name, price, duration_days || 30, ai_quota || 100, description || '']
        );
        await cacheService.clearAll();
        return res.json({ status: 200, error: 0, message: 'Tạo gói cước mới thành công' });
    } catch (err) {
        console.error('admin createPackage error:', err);
        return res.status(500).json({ status: 500, error: 1, message: 'Lỗi tạo gói cước' });
    }
};

exports.deletePackage = async (req, res) => {
    try {
        const id = req.params.id;
        await pool.query(`DELETE FROM vip_packages WHERE id = ?`, [id]);
        await cacheService.clearAll();
        return res.json({ status: 200, error: 0, message: 'Xóa gói cước thành công' });
    } catch (err) {
        return res.status(500).json({ status: 500, error: 1, message: 'Lỗi xóa gói cước' });
    }
};

/**
 * AI Knowledge Management
 */
exports.deleteKnowledge = async (req, res) => {
    try {
        const id = req.params.id;
        const deleted = aiKnowledgeService.deleteKnowledgeItem(id);
        if (!deleted) {
            return res.status(404).json({ status: 404, error: 1, message: 'Không tìm thấy tri thức cần xóa' });
        }
        await cacheService.clearAll();
        return res.json({ status: 200, error: 0, message: 'Đã xóa tri thức AI thành công' });
    } catch (err) {
        return res.status(500).json({ status: 500, error: 1, message: 'Lỗi xóa tri thức AI' });
    }
};

/**
 * Revenue & Transactions Management
 */
exports.getTransactions = async (req, res) => {
    try {
        const status = req.query.status || '';
        const search = req.query.search || '';
        const limit = Number(req.query.limit) || 50;
        const offset = Number(req.query.offset) || 0;

        const result = await getAllTransactions({ status, search, limit, offset });
        return res.json({ status: 200, error: 0, message: 'OK', data: result });
    } catch (err) {
        console.error('admin getTransactions error:', err);
        return res.status(500).json({ status: 500, error: 1, message: 'Lỗi lấy lịch sử giao dịch doanh thu' });
    }
};

exports.updateTransactionStatusController = async (req, res) => {
    try {
        const transId = req.params.id;
        const { status } = req.body;
        if (!['SUCCESS', 'PENDING', 'FAILED', 'CANCELLED'].includes(status)) {
            return res.status(400).json({ status: 400, error: 1, message: 'Trạng thái giao dịch không hợp lệ' });
        }
        await updateTransactionStatus(transId, status);
        await cacheService.clearAll();
        return res.json({ status: 200, error: 0, message: `Cập nhật trạng thái giao dịch thành [${status}] thành công!` });
    } catch (err) {
        console.error('admin updateTransaction error:', err);
        return res.status(500).json({ status: 500, error: 1, message: 'Lỗi cập nhật giao dịch' });
    }
};

exports.deleteTransactionController = async (req, res) => {
    try {
        const transId = req.params.id;
        await deleteTransaction(transId);
        await cacheService.clearAll();
        return res.json({ status: 200, error: 0, message: 'Đã xóa giao dịch thành công' });
    } catch (err) {
        console.error('admin deleteTransaction error:', err);
        return res.status(500).json({ status: 500, error: 1, message: 'Lỗi xóa giao dịch' });
    }
};

