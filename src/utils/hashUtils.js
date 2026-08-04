const crypto = require('crypto');

/**
 * Hash a plain text password using PBKDF2 with a random salt
 */
const hashPassword = (password) => {
    if (!password) return null;
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
};

/**
 * Verify a plain text password against a stored PBKDF2 salt:hash
 */
const verifyPassword = (password, storedHash) => {
    if (!password || !storedHash || typeof storedHash !== 'string' || !storedHash.includes(':')) {
        return false;
    }
    try {
        const [salt, originalHash] = storedHash.split(':');
        const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
        const bufferHash = Buffer.from(hash, 'hex');
        const bufferOriginal = Buffer.from(originalHash, 'hex');
        if (bufferHash.length !== bufferOriginal.length) return false;
        return crypto.timingSafeEqual(bufferHash, bufferOriginal);
    } catch (err) {
        console.error('verifyPassword error:', err);
        return false;
    }
};

module.exports = {
    hashPassword,
    verifyPassword,
};
