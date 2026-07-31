const pool = require('../config/db');
const avatarService = require('./avatarService');
const userCache = require('./userCache');
const { findUserByDeviceIdFromDb, findUserByIdFromDb, findUserByEmail, generateUserCode, upsertAstroProfile, isDuplicateEmailError, createDuplicateEmailError, createInvalidBirthDataError } = require('../models/userModel');
const { buildAstroProfile } = require('./astroService');
const { normalizeBirthday, normalizeBirthTimeForDb } = require('../utils/dateUtils');

const createUser = async (userData) => {
    const {
        full_name, email, birthday, birth_time, gender, device_id, device_info,
        avatar_base64, avatar_url, firebase_token,
    } = userData;
    const normalizedEmail = String(email).trim();
    const normalizedBirthdayTime = normalizeBirthTimeForDb(birth_time);
    const normalizedBirthday = normalizeBirthday(birthday);
    if (!normalizedBirthday || !normalizedBirthdayTime) {
        throw createInvalidBirthDataError('Invalid birthday or birth_time');
    }
    const astroProfile = buildAstroProfile(full_name, normalizedBirthday, normalizedBirthdayTime, gender);
    const canChiString = astroProfile.can_chi;
    const cung_phi = astroProfile.cung_phi;

    const existingUser = await findUserByDeviceIdFromDb(device_id);

    const resolvedAvatarUrl = await avatarService.resolveAvatarUrl({
        avatar_base64,
        avatar_url,
        existingAvatarUrl: existingUser?.avatar_url,
        isUpdate: Boolean(existingUser),
        userId: existingUser?.id,
    });

    const normalized_user_code = generateUserCode();

    if (existingUser) {
        const existingEmailUser = await findUserByEmail(normalizedEmail);
        if (existingEmailUser && existingEmailUser.id !== existingUser.id) {
            throw createDuplicateEmailError(normalizedEmail);
        }

        const sql = `
            UPDATE users
            SET full_name = ?,
                email = ?,
                birthday = ?,
                birth_time = ?,
                gender = ?,
                device_info = ?,
                avatar_url = COALESCE(?, avatar_url),
                firebase_token = ?
            WHERE device_id = ?
        `;
        const values = [
            full_name,
            normalizedEmail,
            normalizedBirthday,
            normalizedBirthdayTime,
            gender,
            device_info,
            resolvedAvatarUrl === undefined ? null : resolvedAvatarUrl,
            firebase_token,
            device_id,
        ];
        try {
            await pool.query(sql, values);
        } catch (error) {
            if (isDuplicateEmailError(error)) {
                throw createDuplicateEmailError(normalizedEmail);
            }
            throw error;
        }

        await upsertAstroProfile(existingUser.id, {
            can_chi: canChiString,
            cung_phi,
            so_chu_dao: astroProfile.so_chu_dao,
            chi_so_su_menh: astroProfile.chi_so_su_menh,
            chi_so_linh_hon: astroProfile.chi_so_linh_hon,
            dung_y: astroProfile.tu_tru?.detail?.dung_y,
            ky_than: astroProfile.tu_tru?.detail?.ky_than,
            tu_tru: astroProfile.tu_tru,
            tu_vi: astroProfile.tu_vi,
            huong: astroProfile.huong,
            mau_sac_vat_pham: astroProfile.mau_sac_vat_pham,
            bieu_do_ngay_sinh: astroProfile.bieu_do_ngay_sinh,
            ngu_hanh_ten: astroProfile.ngu_hanh_ten,
            so_net: astroProfile.so_net,
        });

        await userCache.invalidateUser(existingUser.id, device_id);
        return await findUserByDeviceIdFromDb(device_id);
    }

    const existingEmailUser = await findUserByEmail(normalizedEmail);
    if (existingEmailUser) {
        throw createDuplicateEmailError(normalizedEmail);
    }

    const sql = `
        INSERT INTO users (full_name, email, birthday, birth_time, gender, device_id, device_info, avatar_url, firebase_token, user_code)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
        full_name,
        normalizedEmail,
        normalizedBirthday,
        normalizedBirthdayTime,
        gender,
        device_id,
        device_info,
        resolvedAvatarUrl,
        firebase_token,
        normalized_user_code,
    ];

    let result;
    try {
        [result] = await pool.query(sql, values);
    } catch (error) {
        if (isDuplicateEmailError(error)) {
            throw createDuplicateEmailError(normalizedEmail);
        }
        throw error;
    }
    await upsertAstroProfile(result.insertId, {
        can_chi: canChiString,
        cung_phi,
        so_chu_dao: astroProfile.so_chu_dao,
        chi_so_su_menh: astroProfile.chi_so_su_menh,
        chi_so_linh_hon: astroProfile.chi_so_linh_hon,
        dung_y: astroProfile.tu_tru?.detail?.dung_y,
        ky_than: astroProfile.tu_tru?.detail?.ky_than,
        tu_tru: astroProfile.tu_tru,
        tu_vi: astroProfile.tu_vi,
        huong: astroProfile.huong,
        mau_sac_vat_pham: astroProfile.mau_sac_vat_pham,
        bieu_do_ngay_sinh: astroProfile.bieu_do_ngay_sinh,
        ngu_hanh_ten: astroProfile.ngu_hanh_ten,
        so_net: astroProfile.so_net,
    });

    await userCache.invalidateUser(result.insertId, device_id);
    return await findUserByDeviceIdFromDb(device_id);
};

const updateUser = async (userData) => {
    const {
        user_id, full_name, email, birthday, birth_time, gender, device_info,
        avatar_base64, avatar_url, firebase_token,
    } = userData;
    const userId = Number(user_id);

    if (!userId || Number.isNaN(userId) || userId <= 0) {
        const error = new Error('Invalid user_id');
        error.code = 'INVALID_USER_ID';
        error.status = 400;
        throw error;
    }

    const existingUser = await findUserByIdFromDb(userId);
    if (!existingUser) {
        const error = new Error(`User not found: ${userId}`);
        error.code = 'USER_NOT_FOUND';
        error.status = 404;
        throw error;
    }

    const normalizedEmail = String(email).trim();
    const normalizedBirthday = normalizeBirthday(birthday);
    const normalizedBirthTime = normalizeBirthTimeForDb(birth_time);
    if (!normalizedBirthday || !normalizedBirthTime) {
        throw createInvalidBirthDataError('Invalid birthday or birth_time');
    }

    const resolvedAvatarUrl = await avatarService.resolveAvatarUrl({
        avatar_base64,
        avatar_url,
        existingAvatarUrl: existingUser.avatar_url,
        isUpdate: true,
        userId,
    });

    const astroProfile = buildAstroProfile(full_name, normalizedBirthday, normalizedBirthTime, gender);
    const canChiString = astroProfile.can_chi;
    const cung_phi = astroProfile.cung_phi;

    const existingEmailUser = await findUserByEmail(normalizedEmail);
    if (existingEmailUser && existingEmailUser.id !== userId) {
        throw createDuplicateEmailError(normalizedEmail);
    }

    const sql = `
        UPDATE users
        SET full_name = ?,
            email = ?,
            birthday = ?,
            birth_time = ?,
            gender = ?,
            device_info = ?,
            avatar_url = COALESCE(?, avatar_url),
            firebase_token = ?
        WHERE id = ?
    `;
    const values = [
        full_name,
        normalizedEmail,
        normalizedBirthday,
        normalizedBirthTime,
        gender,
        device_info,
        resolvedAvatarUrl === undefined ? null : resolvedAvatarUrl,
        firebase_token,
        userId,
    ];

    try {
        await pool.query(sql, values);
    } catch (error) {
        if (isDuplicateEmailError(error)) {
            throw createDuplicateEmailError(normalizedEmail);
        }
        throw error;
    }

    await upsertAstroProfile(userId, {
        can_chi: canChiString,
        cung_phi,
        so_chu_dao: astroProfile.so_chu_dao,
        chi_so_su_menh: astroProfile.chi_so_su_menh,
        chi_so_linh_hon: astroProfile.chi_so_linh_hon,
        dung_y: astroProfile.tu_tru?.detail?.dung_y,
        ky_than: astroProfile.tu_tru?.detail?.ky_than,
        tu_tru: astroProfile.tu_tru,
        tu_vi: astroProfile.tu_vi,
        huong: astroProfile.huong,
        mau_sac_vat_pham: astroProfile.mau_sac_vat_pham,
        bieu_do_ngay_sinh: astroProfile.bieu_do_ngay_sinh,
        ngu_hanh_ten: astroProfile.ngu_hanh_ten,
        so_net: astroProfile.so_net,
    });

    await userCache.invalidateUser(userId, existingUser.device_id);
    return await findUserByIdFromDb(userId);
};


module.exports = {
  createUser,
  updateUser
};
