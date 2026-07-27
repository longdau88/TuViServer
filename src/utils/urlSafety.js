const { URL } = require('url');

const BLOCKED_HOSTNAMES = new Set([
    'localhost',
    'metadata.google.internal',
    'metadata.google',
]);

const isPrivateIpv4 = (host) => {
    const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
    if (!match) {
        return false;
    }

    const octets = match.slice(1).map(Number);
    if (octets.some((octet) => octet > 255)) {
        return true;
    }

    const [a, b] = octets;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
};

const isPrivateIpv6 = (host) => {
    const normalized = host.toLowerCase();
    return normalized === '::1'
        || normalized.startsWith('fc')
        || normalized.startsWith('fd')
        || normalized.startsWith('fe80');
};

const assertSafeRemoteImageUrl = (rawUrl) => {
    let parsed;
    try {
        parsed = new URL(rawUrl);
    } catch {
        const error = new Error('Invalid avatar URL');
        error.code = 'INVALID_AVATAR_URL';
        error.status = 400;
        throw error;
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
        const error = new Error('Avatar URL must use http or https');
        error.code = 'INVALID_AVATAR_URL';
        error.status = 400;
        throw error;
    }

    const hostname = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTNAMES.has(hostname) || isPrivateIpv4(hostname) || isPrivateIpv6(hostname)) {
        const error = new Error('Avatar URL is not allowed');
        error.code = 'INVALID_AVATAR_URL';
        error.status = 400;
        throw error;
    }

    if (parsed.username || parsed.password) {
        const error = new Error('Avatar URL must not contain credentials');
        error.code = 'INVALID_AVATAR_URL';
        error.status = 400;
        throw error;
    }

    return parsed.toString();
};

module.exports = {
    assertSafeRemoteImageUrl,
};
