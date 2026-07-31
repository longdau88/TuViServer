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

    const [avatarUrlColumns] = await pool.query("SHOW COLUMNS FROM users LIKE 'avatar_url'");
    if (avatarUrlColumns.length === 0) {
        await pool.query('ALTER TABLE users ADD COLUMN avatar_url VARCHAR(512) NULL AFTER device_info');
        console.log('[DB] Added missing column: users.avatar_url');
    }

    const [avatarBase64Columns] = await pool.query("SHOW COLUMNS FROM users LIKE 'avatar_base64'");
    if (avatarBase64Columns.length > 0) {
        await pool.query('ALTER TABLE users DROP COLUMN avatar_base64');
        console.log('[DB] Dropped deprecated column: users.avatar_base64');
    }

    const [birthTimeColumns] = await pool.query("SHOW COLUMNS FROM users LIKE 'birth_time'");
    if (birthTimeColumns.length === 0) {
        await pool.query('ALTER TABLE users ADD COLUMN birth_time TIME NULL AFTER birthday');
        console.log('[DB] Added missing column: users.birth_time');
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

    // Add missing columns if table already exists
    const newColumns = [
        { name: 'tu_tru', type: 'TEXT NULL' },
        { name: 'tu_vi', type: 'TEXT NULL' },
        { name: 'huong', type: 'TEXT NULL' },
        { name: 'mau_sac_vat_pham', type: 'TEXT NULL' },
        { name: 'bieu_do_ngay_sinh', type: 'TEXT NULL' },
        { name: 'ngu_hanh_ten', type: 'TEXT NULL' },
        { name: 'so_net', type: 'TEXT NULL' },
    ];

    for (const col of newColumns) {
        const [colExists] = await pool.query("SHOW COLUMNS FROM user_astro_profiles LIKE ?", [col.name]);
        if (colExists.length === 0) {
            await pool.query(`ALTER TABLE user_astro_profiles ADD COLUMN ${col.name} ${col.type}`);
            console.log(`[DB] Added missing column: ${col.name}`);
        }
    }

    // Remove deprecated astro_profile column if exists
    const [astroCol] = await pool.query("SHOW COLUMNS FROM user_astro_profiles LIKE 'astro_profile'");
    if (astroCol.length > 0) {
        await pool.query('ALTER TABLE user_astro_profiles DROP COLUMN astro_profile');
        console.log('[DB] Dropped deprecated astro_profile column');
    }
};

const findUserByDeviceIdFromDb = async (deviceId) => {
    const sql = `
        SELECT u.id, u.full_name, u.email, u.birthday, u.gender, u.birth_time,
             u.device_id, u.device_info, u.avatar_url, u.firebase_token, u.user_code, u.created_at, u.updated_at,
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
             u.device_id, u.device_info, u.avatar_url, u.firebase_token, u.user_code, u.created_at, u.updated_at,
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
             u.device_id, u.device_info, u.avatar_url, u.firebase_token, u.user_code, u.created_at, u.updated_at,
               p.can_chi, p.cung_phi, p.life_path, p.expression, p.soul, p.dung_y, p.ky_than,
               p.tu_tru, p.tu_vi, p.huong, p.mau_sac_vat_pham, p.bieu_do_ngay_sinh, p.ngu_hanh_ten, p.so_net
        FROM users u
        LEFT JOIN user_astro_profiles p ON u.id = p.user_id
        WHERE u.email = ?
        LIMIT 1
    `;
    const [rows] = await pool.query(sql, [email]);
    return rows.length > 0 ? formatUserRow(rows[0]) : null;
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
  ensureIndex
};
