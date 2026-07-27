const {
    MAX_DEVICE_ID_LENGTH,
    MAX_EMAIL_LENGTH,
    MAX_NAME_LENGTH,
    MAX_DEVICE_INFO_LENGTH,
    MAX_AVATAR_BASE64_LENGTH,
    MAX_AVATAR_URL_LENGTH,
} = require('../config/security');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const createValidationError = (message) => {
    const error = new Error(message);
    error.code = 'INVALID_INPUT';
    error.status = 400;
    return error;
};

const assertStringLength = (value, fieldName, maxLength, { required = false } = {}) => {
    if (value === undefined || value === null || value === '') {
        if (required) {
            throw createValidationError(`Missing required field: ${fieldName}`);
        }
        return null;
    }

    if (typeof value !== 'string') {
        throw createValidationError(`Invalid ${fieldName}`);
    }

    const trimmed = value.trim();
    if (required && !trimmed) {
        throw createValidationError(`Missing required field: ${fieldName}`);
    }

    if (trimmed.length > maxLength) {
        throw createValidationError(`${fieldName} is too long`);
    }

    return trimmed;
};

const validateUserPayload = (body, { requireDeviceId = false } = {}) => {
    const full_name = assertStringLength(body.full_name, 'full_name', MAX_NAME_LENGTH, { required: true });
    const email = assertStringLength(body.email, 'email', MAX_EMAIL_LENGTH, { required: true });
    const birthday = assertStringLength(body.birthday, 'birthday', 32, { required: true });
    const birth_time = assertStringLength(body.birth_time, 'birth_time', 32, { required: true });
    const gender = assertStringLength(body.gender, 'gender', 50, { required: true });
    const device_id = assertStringLength(body.device_id, 'device_id', MAX_DEVICE_ID_LENGTH, { required: requireDeviceId });

    if (!EMAIL_PATTERN.test(email)) {
        throw createValidationError('Invalid email format');
    }

    if (device_id && !/^[a-zA-Z0-9._-]+$/.test(device_id)) {
        throw createValidationError('Invalid device_id format');
    }

    if (body.device_info !== undefined && body.device_info !== null) {
        const deviceInfo = typeof body.device_info === 'string'
            ? body.device_info
            : JSON.stringify(body.device_info);
        if (deviceInfo.length > MAX_DEVICE_INFO_LENGTH) {
            throw createValidationError('device_info is too long');
        }
    }

    if (body.avatar_base64 !== undefined && body.avatar_base64 !== null) {
        const avatarBase64 = String(body.avatar_base64);
        if (avatarBase64.length > MAX_AVATAR_BASE64_LENGTH) {
            throw createValidationError('Avatar image is too large');
        }
    }

    if (body.avatar_url !== undefined && body.avatar_url !== null) {
        const avatarUrl = String(body.avatar_url).trim();
        if (avatarUrl.length > MAX_AVATAR_URL_LENGTH) {
            throw createValidationError('avatar_url is too long');
        }
    }

    if (body.user_id !== undefined && body.user_id !== null && body.user_id !== '') {
        const userId = Number(body.user_id);
        if (!userId || Number.isNaN(userId) || userId <= 0) {
            throw createValidationError('Invalid user_id');
        }
    }

    return {
        full_name,
        email,
        birthday,
        birth_time,
        gender,
        device_id,
    };
};

const validateDeviceIdQuery = (deviceId) => {
    const normalized = assertStringLength(deviceId, 'device_id', MAX_DEVICE_ID_LENGTH, { required: true });
    if (!/^[a-zA-Z0-9._-]+$/.test(normalized)) {
        throw createValidationError('Invalid device_id format');
    }
    return normalized;
};

const validateUserIdQuery = (userIdRaw) => {
    const userId = Number(userIdRaw);
    if (!userId || Number.isNaN(userId) || userId <= 0) {
        throw createValidationError('Missing or invalid user_id parameter');
    }
    return userId;
};

const handleValidationError = (res, error) => {
    if (error.code === 'INVALID_INPUT') {
        return res.status(error.status || 400).json({
            status: error.status || 400,
            error: 1,
            message: error.message,
            data: {},
        });
    }
    return null;
};

module.exports = {
    validateUserPayload,
    validateDeviceIdQuery,
    validateUserIdQuery,
    handleValidationError,
};
