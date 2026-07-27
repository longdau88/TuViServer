const { uploadImage } = require('./imgbbService');
const { assertSafeRemoteImageUrl } = require('../utils/urlSafety');
const { MAX_AVATAR_BASE64_LENGTH, MAX_AVATAR_URL_LENGTH } = require('../config/security');

const isHttpUrl = (value) => typeof value === 'string' && /^https?:\/\//i.test(value.trim());

const createValidationError = (message) => {
    const error = new Error(message);
    error.code = 'INVALID_AVATAR';
    error.status = 400;
    return error;
};

const stripDataUrlPrefix = (value) => {
    const trimmed = value.trim();
    const match = /^data:image\/(?:jpeg|jpg|png|gif|webp|bmp);base64,(.+)$/i.exec(trimmed);
    if (!match) {
        if (/^data:/i.test(trimmed)) {
            throw createValidationError('Avatar must be a JPEG, PNG, GIF, WEBP, or BMP image');
        }
        return trimmed;
    }
    return match[1];
};

const normalizeOptionalString = (value) => {
    if (value === undefined || value === null) {
        return null;
    }
    const trimmed = String(value).trim();
    return trimmed.length > 0 ? trimmed : null;
};

const assertBase64Size = (value) => {
    if (value.length > MAX_AVATAR_BASE64_LENGTH) {
        throw createValidationError('Avatar image is too large');
    }
};

const extractIncomingImage = (avatarBase64, avatarUrl) => {
    const normalizedBase64 = normalizeOptionalString(avatarBase64);
    if (normalizedBase64) {
        assertBase64Size(normalizedBase64);
        return stripDataUrlPrefix(normalizedBase64);
    }

    const normalizedUrl = normalizeOptionalString(avatarUrl);
    if (!normalizedUrl) {
        return null;
    }

    if (normalizedUrl.length > MAX_AVATAR_URL_LENGTH) {
        throw createValidationError('avatar_url is too long');
    }

    if (isHttpUrl(normalizedUrl)) {
        return assertSafeRemoteImageUrl(normalizedUrl);
    }

    assertBase64Size(normalizedUrl);
    return stripDataUrlPrefix(normalizedUrl);
};

const hasAvatarInput = (avatarBase64, avatarUrl) => (
    Boolean(normalizeOptionalString(avatarBase64))
    || Boolean(normalizeOptionalString(avatarUrl))
);

const sanitizeUploadName = (userId) => {
    if (!userId) {
        return 'user-avatar';
    }
    return `user-${String(userId).replace(/[^0-9]/g, '')}-avatar`;
};

/**
 * Returns uploaded URL, null (no avatar), or undefined (keep existing on update).
 */
const resolveAvatarUrl = async ({
    avatar_base64,
    avatar_url,
    existingAvatarUrl,
    isUpdate,
    userId,
}) => {
    if (!hasAvatarInput(avatar_base64, avatar_url)) {
        return isUpdate ? undefined : null;
    }

    const imagePayload = extractIncomingImage(avatar_base64, avatar_url);
    if (!imagePayload) {
        return isUpdate ? undefined : null;
    }

    if (isUpdate && isHttpUrl(imagePayload) && imagePayload === existingAvatarUrl) {
        return undefined;
    }

    return uploadImage(imagePayload, sanitizeUploadName(userId));
};

module.exports = {
    resolveAvatarUrl,
    hasAvatarInput,
};
