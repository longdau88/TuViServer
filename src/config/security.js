const MAX_AVATAR_BASE64_LENGTH = Number(process.env.MAX_AVATAR_BASE64_LENGTH) || 7_000_000;
const MAX_AVATAR_URL_LENGTH = Number(process.env.MAX_AVATAR_URL_LENGTH) || 2048;
const MAX_DEVICE_ID_LENGTH = 255;
const MAX_EMAIL_LENGTH = 255;
const MAX_NAME_LENGTH = 255;
const MAX_DEVICE_INFO_LENGTH = 10_000;
const JSON_BODY_LIMIT = process.env.JSON_BODY_LIMIT || '2mb';
const AVATAR_BODY_LIMIT = process.env.AVATAR_BODY_LIMIT || '8mb';

const isProduction = () => process.env.NODE_ENV === 'production';

module.exports = {
    MAX_AVATAR_BASE64_LENGTH,
    MAX_AVATAR_URL_LENGTH,
    MAX_DEVICE_ID_LENGTH,
    MAX_EMAIL_LENGTH,
    MAX_NAME_LENGTH,
    MAX_DEVICE_INFO_LENGTH,
    JSON_BODY_LIMIT,
    AVATAR_BODY_LIMIT,
    isProduction,
};
