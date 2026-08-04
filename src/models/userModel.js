const pool = require('../config/db');
const cacheService = require('../services/cacheService');
const userCache = require('../services/userCache');
const { normalizeBirthday, normalizeBirthTime, formatDateToYMD } = require('../utils/dateUtils');
const { convertToLunar, parseJsonMaybe } = require('../services/astroService');
const { extractAvatarUrl, normalizeStoredAvatarUrl } = require('../services/displayService');

const formatUserRow = (row) => {
    if (!row) return null;
    const lunar_birth = convertToLunar(row.birthday);
    const deviceInfoParsed = parseJsonMaybe(row.device_info);
    const avatarUrl = normalizeStoredAvatarUrl(row.avatar_url) || extractAvatarUrl(deviceInfoParsed);
    let tu_tru = null;
    if (row.tu_tru) {
        tu_tru = parseJsonMaybe(row.tu_tru);
    }
    let tu_vi = null;
    if (row.tu_vi) {
        tu_vi = parseJsonMaybe(row.tu_vi);
    }
    let huong = null;
    if (row.huong) {
        huong = parseJsonMaybe(row.huong);
    }
    let mau_sac_vat_pham = null;
    if (row.mau_sac_vat_pham) {
        mau_sac_vat_pham = parseJsonMaybe(row.mau_sac_vat_pham);
    }
    let ngu_hanh_ten = null;
    if (row.ngu_hanh_ten) {
        ngu_hanh_ten = parseJsonMaybe(row.ngu_hanh_ten);
    }
    let so_net = null;
    if (row.so_net) {
        so_net = parseJsonMaybe(row.so_net);
    }
    const astro_profile = {
        lunar_birth,
        can_chi: row.can_chi || null,
        tu_tru,
        tu_vi,
        cung_phi: row.cung_phi || null,
        huong,
        mau_sac_vat_pham,
        so_chu_dao: row.life_path || null,
        chi_so_su_menh: row.expression || null,
        chi_so_linh_hon: row.soul || null,
        bieu_do_ngay_sinh: row.bieu_do_ngay_sinh || null,
        ngu_hanh_ten,
        so_net,
    };
    return {
        id: row.id,
        full_name: row.full_name,
        email: row.email,
        birthday: row.birthday ? formatDateToYMD(row.birthday) : null,
        lunar_birth,
        birth_time: normalizeBirthTime(row.birth_time) || "",
        gender: row.gender || null,
        device_id: row.device_id || null,
        device_info: row.device_info || null,
        device_info_parsed: deviceInfoParsed,
        avatar_url: avatarUrl,
        firebase_token: row.firebase_token || null,
        user_code: row.user_code || null,
        role: row.role || 'user',
        is_vip: Boolean(row.is_vip),
        vip_expires_at: row.vip_expires_at ? formatDateToYMD(row.vip_expires_at) : null,
        ai_quota: row.ai_quota !== undefined && row.ai_quota !== null ? Number(row.ai_quota) : 5,
        created_at: row.created_at,
        updated_at: row.updated_at,
        can_chi: row.can_chi || null,
        cung_phi: row.cung_phi || null,
        life_path: row.life_path || null,
        expression: row.expression || null,
        soul: row.soul || null,
        dung_y: row.dung_y || null,
        ky_than: row.ky_than || null,
        astro_profile,
    };
};

const upsertAstroProfile = async (userId, astroData) => {
    const {
        can_chi,
        cung_phi,
        so_chu_dao,
        chi_so_su_menh,
        chi_so_linh_hon,
        dung_y,
        ky_than,
        tu_tru,
        tu_vi,
        huong,
        mau_sac_vat_pham,
        bieu_do_ngay_sinh,
        ngu_hanh_ten,
        so_net,
    } = astroData;
    const sql = `
        INSERT INTO user_astro_profiles (
            user_id,
            can_chi,
            cung_phi,
            life_path,
            expression,
            soul,
            dung_y,
            ky_than,
            tu_tru,
            tu_vi,
            huong,
            mau_sac_vat_pham,
            bieu_do_ngay_sinh,
            ngu_hanh_ten,
            so_net
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            can_chi = VALUES(can_chi),
            cung_phi = VALUES(cung_phi),
            life_path = VALUES(life_path),
            expression = VALUES(expression),
            soul = VALUES(soul),
            dung_y = VALUES(dung_y),
            ky_than = VALUES(ky_than),
            tu_tru = VALUES(tu_tru),
            tu_vi = VALUES(tu_vi),
            huong = VALUES(huong),
            mau_sac_vat_pham = VALUES(mau_sac_vat_pham),
            bieu_do_ngay_sinh = VALUES(bieu_do_ngay_sinh),
            ngu_hanh_ten = VALUES(ngu_hanh_ten),
            so_net = VALUES(so_net),
            updated_at = CURRENT_TIMESTAMP
    `;
    const values = [
        userId,
        can_chi,
        cung_phi,
        so_chu_dao,
        chi_so_su_menh,
        chi_so_linh_hon,
        dung_y,
        ky_than,
        JSON.stringify(tu_tru),
        JSON.stringify(tu_vi),
        JSON.stringify(huong),
        JSON.stringify(mau_sac_vat_pham),
        bieu_do_ngay_sinh,
        JSON.stringify(ngu_hanh_ten),
        JSON.stringify(so_net),
    ];
    await pool.query(sql, values);
};

const ensureIndex = async (tableName, indexName, sql) => {
    const [indexes] = await pool.query(
        'SHOW INDEX FROM ?? WHERE Key_name = ?',
        [tableName, indexName],
    );

    if (indexes.length === 0) {
        await pool.query(sql);
        console.log(`[DB] Added missing index: ${tableName}.${indexName}`);
    }
};

const createUsersTable = async () => {
    const sql = `
    CREATE TABLE IF NOT EXISTS users (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      birthday DATE NULL,
      birth_time TIME NULL,
      gender VARCHAR(50) NULL,
      device_id VARCHAR(255) NULL,
      device_info TEXT NULL,
      avatar_url VARCHAR(512) NULL,
      firebase_token TEXT NULL,
      user_code VARCHAR(100) NULL,
      role VARCHAR(50) DEFAULT 'user',
      is_vip TINYINT(1) DEFAULT 0,
      vip_expires_at DATETIME NULL,
      ai_quota INT DEFAULT 5,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

    await pool.query(sql);

    await ensureIndex(
        'users',
        'idx_users_device_id',
        'CREATE INDEX idx_users_device_id ON users (device_id)',
    );

    // Auto add admin/vip columns if users table exists
    const userColumnsToEnsure = [
        { name: 'role', type: "VARCHAR(50) DEFAULT 'user'" },
        { name: 'is_vip', type: "TINYINT(1) DEFAULT 0" },
        { name: 'vip_expires_at', type: "DATETIME NULL" },
        { name: 'ai_quota', type: "INT DEFAULT 5" },
        { name: 'avatar_url', type: "VARCHAR(512) NULL" },
        { name: 'birth_time', type: "TIME NULL" },
        { name: 'password_hash', type: "VARCHAR(255) NULL" },
    ];

    for (const col of userColumnsToEnsure) {
        const [colExists] = await pool.query("SHOW COLUMNS FROM users LIKE ?", [col.name]);
        if (colExists.length === 0) {
            await pool.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
            console.log(`[DB] Added missing column: users.${col.name}`);
        }
    }

    // Seed default admin in Database if no admin exists or password_hash is missing
    const { hashPassword } = require('../utils/hashUtils');
    const [adminUsers] = await pool.query("SELECT id, password_hash FROM users WHERE role = 'admin' LIMIT 1");
    if (adminUsers.length === 0) {
        const defaultAdminPassHash = hashPassword('admin123');
        await pool.query(
            `INSERT INTO users (full_name, email, role, password_hash, is_vip, ai_quota) VALUES (?, ?, 'admin', ?, 1, 99999)`,
            ['admin', 'admin@tuvi.com', defaultAdminPassHash]
        );
        console.log('[DB] Seeded initial Admin user in Database: admin / admin@tuvi.com (Password: admin123)');
    } else if (!adminUsers[0].password_hash) {
        const defaultAdminPassHash = hashPassword('admin123');
        await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [defaultAdminPassHash, adminUsers[0].id]);
        console.log('[DB] Updated Admin password_hash in Database to default: admin123');
    }


    const [avatarBase64Columns] = await pool.query("SHOW COLUMNS FROM users LIKE 'avatar_base64'");
    if (avatarBase64Columns.length > 0) {
        await pool.query('ALTER TABLE users DROP COLUMN avatar_base64');
        console.log('[DB] Dropped deprecated column: users.avatar_base64');
    }


    const sqlAstro = `
    CREATE TABLE IF NOT EXISTS user_astro_profiles (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id INT UNSIGNED NOT NULL,
      can_chi VARCHAR(255) NULL,
      cung_phi VARCHAR(50) NULL,
      life_path TINYINT UNSIGNED NULL,
      expression TINYINT UNSIGNED NULL,
      soul TINYINT UNSIGNED NULL,
      dung_y VARCHAR(50) NULL,
      ky_than VARCHAR(50) NULL,
      tu_tru TEXT NULL,
      tu_vi TEXT NULL,
      huong TEXT NULL,
      mau_sac_vat_pham TEXT NULL,
      bieu_do_ngay_sinh TEXT NULL,
      ngu_hanh_ten TEXT NULL,
      so_net TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_user_id (user_id),
      KEY idx_cung_phi (cung_phi),
      CONSTRAINT fk_user_astro_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

    await pool.query(sqlAstro);

    // Create VIP packages table
    const sqlPackages = `
    CREATE TABLE IF NOT EXISTS vip_packages (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      code VARCHAR(100) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      price DECIMAL(10, 2) NOT NULL DEFAULT 0,
      duration_days INT NOT NULL DEFAULT 30,
      ai_quota INT NOT NULL DEFAULT 100,
      description TEXT NULL,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await pool.query(sqlPackages);

    // Create Transactions table
    const sqlTransactions = `
    CREATE TABLE IF NOT EXISTS transactions (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id INT UNSIGNED NOT NULL,
      package_code VARCHAR(100) NULL,
      amount DECIMAL(10, 2) NOT NULL,
      payment_method VARCHAR(50) DEFAULT 'VietQR',
      status VARCHAR(50) DEFAULT 'PENDING',
      transaction_ref VARCHAR(255) NULL,
      paid_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_trans_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await pool.query(sqlTransactions);

    // Auto add paid_at column if missing
    const [paidAtCol] = await pool.query("SHOW COLUMNS FROM transactions LIKE 'paid_at'");
    if (paidAtCol.length === 0) {
        await pool.query("ALTER TABLE transactions ADD COLUMN paid_at DATETIME NULL");
    }

    // Seed default VIP packages if empty
    const [pkgs] = await pool.query("SELECT id FROM vip_packages LIMIT 1");
    if (pkgs.length === 0) {
        await pool.query(`
            INSERT INTO vip_packages (code, name, price, duration_days, ai_quota, description) VALUES
            ('VIP_1M', 'Gói VIP 1 Tháng', 99000, 30, 150, 'Quyền lợi: Xem tử vi trọn gói, 150 lượt AI Chat/ngày'),
            ('VIP_3M', 'Gói VIP 3 Tháng', 249000, 90, 300, 'Tiết kiệm 20%: Xem tử vi trọn gói, 300 lượt AI Chat/ngày'),
            ('VIP_1Y', 'Gói VIP 1 Năm', 799000, 365, 999, 'Tiết kiệm 40%: VIP trọn năm, AI Chat không giới hạn')
        `);
        console.log('[DB] Seeded initial VIP packages');
    }

    // Clean up sample demo transactions if any
    await pool.query("DELETE FROM transactions WHERE transaction_ref IN ('FT260804001928', 'MM260804008812')");

    // Create Divination History table
    const sqlDivination = `
    CREATE TABLE IF NOT EXISTS divination_history (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id INT UNSIGNED NULL,
      device_id VARCHAR(255) NULL,
      hexagram_id INT NOT NULL,
      hexagram_name VARCHAR(255) NOT NULL,
      summary TEXT NULL,
      advice TEXT NULL,
      draw_date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_user_date (user_id, draw_date),
      KEY idx_device_date (device_id, draw_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await pool.query(sqlDivination);
};




const findUserByDeviceIdFromDb = async (deviceId) => {
    const sql = `
        SELECT u.id, u.full_name, u.email, u.birthday, u.gender, u.birth_time,
             u.device_id, u.device_info, u.avatar_url, u.firebase_token, u.user_code,
             u.role, u.is_vip, u.vip_expires_at, u.ai_quota, u.created_at, u.updated_at,
               p.can_chi, p.cung_phi, p.life_path, p.expression, p.soul, p.dung_y, p.ky_than,
               p.tu_tru, p.tu_vi, p.huong, p.mau_sac_vat_pham, p.bieu_do_ngay_sinh, p.ngu_hanh_ten, p.so_net
        FROM users u
        LEFT JOIN user_astro_profiles p ON u.id = p.user_id
        WHERE u.device_id = ?
        LIMIT 1
    `;
    const [rows] = await pool.query(sql, [deviceId]);
    return rows.length > 0 ? formatUserRow(rows[0]) : null;
};

const findUserByDeviceId = async (deviceId) => {
    const cacheKey = userCache.keys.userByDevice(deviceId);
    const cached = await cacheService.get(cacheKey);
    if (cached !== undefined) {
        return cached;
    }

    const user = await findUserByDeviceIdFromDb(deviceId);
    const ttl = user === null
        ? (Number(process.env.CACHE_MISS_TTL_SECONDS) || 60)
        : userCache.userTtl();
    await cacheService.set(cacheKey, user, ttl);
    return user;
};

const findUserByIdFromDb = async (userId) => {
    const sql = `
        SELECT u.id, u.full_name, u.email, u.birthday, u.gender, u.birth_time,
             u.device_id, u.device_info, u.avatar_url, u.firebase_token, u.user_code,
             u.role, u.is_vip, u.vip_expires_at, u.ai_quota, u.created_at, u.updated_at,
               p.can_chi, p.cung_phi, p.life_path, p.expression, p.soul, p.dung_y, p.ky_than,
               p.tu_tru, p.tu_vi, p.huong, p.mau_sac_vat_pham, p.bieu_do_ngay_sinh, p.ngu_hanh_ten, p.so_net
        FROM users u
        LEFT JOIN user_astro_profiles p ON u.id = p.user_id
        WHERE u.id = ?
        LIMIT 1
    `;
    const [rows] = await pool.query(sql, [userId]);
    return rows.length > 0 ? formatUserRow(rows[0]) : null;
};

const findUserById = async (userId) => {
    const cacheKey = userCache.keys.userById(userId);
    const cached = await cacheService.get(cacheKey);
    if (cached !== undefined) {
        return cached;
    }

    const user = await findUserByIdFromDb(userId);
    const ttl = user === null
        ? (Number(process.env.CACHE_MISS_TTL_SECONDS) || 60)
        : userCache.userTtl();
    await cacheService.set(cacheKey, user, ttl);
    return user;
};

const findUserByEmail = async (email) => {
    const sql = `
        SELECT u.id, u.full_name, u.email, u.birthday, u.gender, u.birth_time,  
             u.device_id, u.device_info, u.avatar_url, u.firebase_token, u.user_code,
             u.role, u.is_vip, u.vip_expires_at, u.ai_quota, u.created_at, u.updated_at,
               p.can_chi, p.cung_phi, p.life_path, p.expression, p.soul, p.dung_y, p.ky_than,
               p.tu_tru, p.tu_vi, p.huong, p.mau_sac_vat_pham, p.bieu_do_ngay_sinh, p.ngu_hanh_ten, p.so_net
        FROM users u
        WHERE u.email = ?
        LIMIT 1
    `;
    const [rows] = await pool.query(sql, [email]);
    return rows.length > 0 ? formatUserRow(rows[0]) : null;
};

const getAllUsers = async (search = '', limit = 50, offset = 0) => {

    let sql = `
        SELECT u.id, u.full_name, u.email, u.birthday, u.gender, u.role, u.is_vip, u.vip_expires_at, u.ai_quota, u.created_at
        FROM users u
    `;
    const params = [];
    if (search) {
        sql += ` WHERE u.full_name LIKE ? OR u.email LIKE ?`;
        params.push(`%${search}%`, `%${search}%`);
    }
    sql += ` ORDER BY u.id DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.query(sql, params);
    
    let countSql = `SELECT COUNT(*) as total FROM users`;
    const countParams = [];
    if (search) {
        countSql += ` WHERE full_name LIKE ? OR email LIKE ?`;
        countParams.push(`%${search}%`, `%${search}%`);
    }
    const [countRows] = await pool.query(countSql, countParams);
    
    return {
        users: rows.map(r => ({
            id: r.id,
            full_name: r.full_name,
            email: r.email,
            birthday: r.birthday ? formatDateToYMD(r.birthday) : null,
            gender: r.gender,
            role: r.role || 'user',
            is_vip: Boolean(r.is_vip),
            vip_expires_at: r.vip_expires_at ? formatDateToYMD(r.vip_expires_at) : null,
            ai_quota: r.ai_quota !== null ? r.ai_quota : 5,
            created_at: r.created_at
        })),
        total: countRows[0].total
    };
};

const getUsersByRole = async (targetRole = 'user', search = '', limit = 50, offset = 0) => {

    let sql = `
        SELECT u.id, u.full_name, u.email, u.birthday, u.gender, u.role, u.is_vip, u.vip_expires_at, u.ai_quota, u.created_at
        FROM users u
        WHERE u.role = ?
    `;
    const params = [targetRole];
    if (search) {
        sql += ` AND (u.full_name LIKE ? OR u.email LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
    }
    sql += ` ORDER BY u.id DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.query(sql, params);
    
    let countSql = `SELECT COUNT(*) as total FROM users WHERE role = ?`;
    const countParams = [targetRole];
    if (search) {
        countSql += ` AND (full_name LIKE ? OR email LIKE ?)`;
        countParams.push(`%${search}%`, `%${search}%`);
    }
    const [countRows] = await pool.query(countSql, countParams);
    
    return {
        users: rows.map(r => ({
            id: r.id,
            full_name: r.full_name,
            email: r.email,
            birthday: r.birthday ? formatDateToYMD(r.birthday) : null,
            gender: r.gender,
            role: r.role || 'user',
            is_vip: Boolean(r.is_vip),
            vip_expires_at: r.vip_expires_at ? formatDateToYMD(r.vip_expires_at) : null,
            ai_quota: r.ai_quota !== null ? r.ai_quota : 5,
            created_at: r.created_at
        })),
        total: countRows[0].total
    };
};

const createUserAccount = async (userData) => {
    const { hashPassword } = require('../utils/hashUtils');
    const { full_name, email, password, role = 'user', gender = null, birthday = null, is_vip = 0, ai_quota = 5 } = userData;
    
    const [existing] = await pool.query(`SELECT id FROM users WHERE email = ? LIMIT 1`, [email]);
    if (existing.length > 0) {
        const err = new Error('Email đã tồn tại trong hệ thống');
        err.status = 400;
        throw err;
    }

    const rawPassword = (password && password.trim()) ? password.trim() : '123456';
    const password_hash = hashPassword(rawPassword);
    const sql = `
        INSERT INTO users (full_name, email, role, password_hash, gender, birthday, is_vip, ai_quota)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.query(sql, [full_name, email, role, password_hash, gender, birthday, is_vip ? 1 : 0, ai_quota]);
    return result.insertId;
};

const updateUserAccount = async (userId, userData) => {
    const { hashPassword } = require('../utils/hashUtils');
    const { full_name, email, password, role, gender, is_vip, ai_quota, days } = userData;

    const fields = [];
    const params = [];

    if (full_name !== undefined) { fields.push('full_name = ?'); params.push(full_name); }
    if (email !== undefined) { fields.push('email = ?'); params.push(email); }
    if (role !== undefined) { fields.push('role = ?'); params.push(role); }
    if (gender !== undefined) { fields.push('gender = ?'); params.push(gender); }
    if (ai_quota !== undefined) { fields.push('ai_quota = ?'); params.push(Number(ai_quota)); }
    if (password && password.trim()) {
        fields.push('password_hash = ?');
        params.push(hashPassword(password.trim()));
    }
    if (is_vip !== undefined) {
        fields.push('is_vip = ?');
        params.push(is_vip ? 1 : 0);
        if (is_vip) {
            const d = new Date();
            d.setDate(d.getDate() + Number(days || 30));
            fields.push('vip_expires_at = ?');
            params.push(d.toISOString().slice(0, 19).replace('T', ' '));
        } else {
            fields.push('vip_expires_at = NULL');
        }
    }

    if (fields.length === 0) return;

    params.push(userId);
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    await pool.query(sql, params);
};

const deleteUserAccount = async (userId) => {
    await pool.query(`DELETE FROM users WHERE id = ?`, [userId]);
};

const updateUserRole = async (userId, role) => {
    await pool.query(`UPDATE users SET role = ? WHERE id = ?`, [role, userId]);
};

const updateUserVip = async (userId, isVip, days = 30, quota = 100) => {
    let expiresAt = null;
    if (isVip) {
        const d = new Date();
        d.setDate(d.getDate() + Number(days));
        expiresAt = d.toISOString().slice(0, 19).replace('T', ' ');
    }
    await pool.query(
        `UPDATE users SET is_vip = ?, vip_expires_at = ?, ai_quota = ? WHERE id = ?`,
        [isVip ? 1 : 0, expiresAt, quota, userId]
    );
};

const getAdminStats = async () => {
    const [userCount] = await pool.query(`SELECT COUNT(*) as totalUsers, SUM(CASE WHEN is_vip = 1 THEN 1 ELSE 0 END) as vipUsers FROM users`);
    const [transCount] = await pool.query(`SELECT COUNT(*) as totalTrans, SUM(CASE WHEN status = 'SUCCESS' THEN amount ELSE 0 END) as totalRevenue FROM transactions`);
    return {
        totalUsers: userCount[0].totalUsers || 0,
        vipUsers: userCount[0].vipUsers || 0,
        totalTransactions: transCount[0].totalTrans || 0,
        totalRevenue: transCount[0].totalRevenue || 0
    };
};

const createDuplicateEmailError = (email) => {
    const error = new Error(`Email already exists: ${email}`);
    error.code = 'DUPLICATE_EMAIL';
    error.status = 409;
    return error;
};

const createInvalidBirthDataError = (message) => {
    const error = new Error(message);
    error.code = 'INVALID_BIRTH_DATA';
    error.status = 400;
    return error;
};

const isDuplicateEmailError = (error) => (
    error?.code === 'ER_DUP_ENTRY'
    && (error?.sqlMessage || '').toLowerCase().includes('email')
);

const generateUserCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};


const getAllTransactions = async ({ status = '', search = '', limit = 50, offset = 0 } = {}) => {
    let sql = `
        SELECT t.id, t.user_id, t.package_code, t.amount, t.payment_method, t.status, 
               t.transaction_ref, t.created_at, t.paid_at,
               u.full_name as user_name, u.email as user_email
        FROM transactions t
        LEFT JOIN users u ON t.user_id = u.id
        WHERE 1=1
    `;
    const params = [];
    if (status) {
        sql += ` AND t.status = ?`;
        params.push(status);
    }
    if (search) {
        sql += ` AND (t.transaction_ref LIKE ? OR u.full_name LIKE ? OR u.email LIKE ? OR t.package_code LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    sql += ` ORDER BY t.id DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.query(sql, params);

    let countSql = `
        SELECT COUNT(*) as total, 
               SUM(CASE WHEN t.status = 'SUCCESS' THEN t.amount ELSE 0 END) as totalRevenue,
               SUM(CASE WHEN t.status = 'SUCCESS' THEN 1 ELSE 0 END) as successCount,
               SUM(CASE WHEN t.status = 'PENDING' THEN 1 ELSE 0 END) as pendingCount
        FROM transactions t
        LEFT JOIN users u ON t.user_id = u.id
        WHERE 1=1
    `;
    const countParams = [];
    if (status) {
        countSql += ` AND t.status = ?`;
        countParams.push(status);
    }
    if (search) {
        countSql += ` AND (t.transaction_ref LIKE ? OR u.full_name LIKE ? OR u.email LIKE ? OR t.package_code LIKE ?)`;
        countParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    const [countRows] = await pool.query(countSql, countParams);

    return {
        transactions: rows.map(r => ({
            id: r.id,
            user_id: r.user_id,
            user_name: r.user_name || 'N/A',
            user_email: r.user_email || 'N/A',
            package_code: r.package_code || 'N/A',
            amount: Number(r.amount),
            payment_method: r.payment_method || 'VietQR',
            status: r.status,
            transaction_ref: r.transaction_ref || `TRANS_${r.id}`,
            created_at: r.created_at,
            paid_at: r.paid_at || (r.status === 'SUCCESS' ? r.created_at : null)
        })),
        total: countRows[0].total || 0,
        totalRevenue: Number(countRows[0].totalRevenue || 0),
        successCount: Number(countRows[0].successCount || 0),
        pendingCount: Number(countRows[0].pendingCount || 0)
    };
};

const updateTransactionStatus = async (transId, status) => {
    const paidAt = status === 'SUCCESS' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null;
    await pool.query(
        `UPDATE transactions SET status = ?, paid_at = ? WHERE id = ?`,
        [status, paidAt, transId]
    );

    if (status === 'SUCCESS') {
        const [trans] = await pool.query(`SELECT user_id, package_code FROM transactions WHERE id = ?`, [transId]);
        if (trans.length > 0) {
            const { user_id, package_code } = trans[0];
            let days = 30;
            let quota = 100;
            if (package_code) {
                const [pkgs] = await pool.query(`SELECT duration_days, ai_quota FROM vip_packages WHERE code = ?`, [package_code]);
                if (pkgs.length > 0) {
                    days = pkgs[0].duration_days;
                    quota = pkgs[0].ai_quota;
                }
            }
            await updateUserVip(user_id, true, days, quota);
        }
    }
};

const deleteTransaction = async (transId) => {
    await pool.query(`DELETE FROM transactions WHERE id = ?`, [transId]);
};

const saveDivinationDraw = async ({ user_id = null, device_id = null, hexagram_id, hexagram_name, summary, advice, draw_date }) => {
    const sql = `
        INSERT INTO divination_history (user_id, device_id, hexagram_id, hexagram_name, summary, advice, draw_date)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(sql, [user_id, device_id, hexagram_id, hexagram_name, summary, advice, draw_date]);
    return result.insertId;
};

const getTodayDivinationDraw = async ({ user_id = null, device_id = null, draw_date }) => {
    let sql = `SELECT * FROM divination_history WHERE draw_date = ?`;
    const params = [draw_date];

    if (user_id) {
        sql += ` AND user_id = ?`;
        params.push(user_id);
    } else if (device_id) {
        sql += ` AND device_id = ?`;
        params.push(device_id);
    } else {
        return null;
    }

    sql += ` ORDER BY id DESC LIMIT 1`;
    const [rows] = await pool.query(sql, params);
    return rows.length > 0 ? rows[0] : null;
};

const getDivinationHistory = async ({ user_id = null, device_id = null, limit = 20, offset = 0 } = {}) => {
    let sql = `SELECT * FROM divination_history WHERE 1=1`;
    const params = [];

    if (user_id) {
        sql += ` AND user_id = ?`;
        params.push(user_id);
    } else if (device_id) {
        sql += ` AND device_id = ?`;
        params.push(device_id);
    }

    sql += ` ORDER BY id DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.query(sql, params);
    return rows;
};

module.exports = {
  createUsersTable,
  findUserByDeviceIdFromDb,
  findUserByIdFromDb,
  findUserByEmail,
  createDuplicateEmailError,
  createInvalidBirthDataError,
  isDuplicateEmailError,
  generateUserCode,
  formatUserRow,
  upsertAstroProfile,
  findUserByDeviceId,
  findUserById,
  ensureIndex,
  getAllUsers,
  getUsersByRole,
  createUserAccount,
  updateUserAccount,
  deleteUserAccount,
  updateUserRole,
  updateUserVip,
  getAdminStats,
  getAllTransactions,
  updateTransactionStatus,
  deleteTransaction,
  saveDivinationDraw,
  getTodayDivinationDraw,
  getDivinationHistory
};



