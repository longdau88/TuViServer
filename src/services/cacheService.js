const { getRedis, isRedisReady } = require('../config/redis');

const NULL_SENTINEL = '__NULL__';

const defaultTtlSeconds = () => {
    const base = Number(process.env.CACHE_TTL_SECONDS) || 300;
    const jitter = Math.floor(Math.random() * 60);
    return base + jitter;
};

const parseCached = (raw) => {
    if (raw === NULL_SENTINEL) {
        return null;
    }
    try {
        return JSON.parse(raw);
    } catch {
        return undefined;
    }
};

const get = async (key) => {
    if (!isRedisReady()) {
        return undefined;
    }
    try {
        const raw = await getRedis().get(key);
        if (raw === null) {
            return undefined;
        }
        return parseCached(raw);
    } catch (error) {
        console.warn('[Cache] get failed:', key, error.message);
        return undefined;
    }
};

const set = async (key, value, ttlSeconds = defaultTtlSeconds()) => {
    if (!isRedisReady()) {
        return false;
    }
    try {
        const payload = value === null ? NULL_SENTINEL : JSON.stringify(value);
        await getRedis().setex(key, ttlSeconds, payload);
        return true;
    } catch (error) {
        console.warn('[Cache] set failed:', key, error.message);
        return false;
    }
};

const del = async (...keys) => {
    if (!isRedisReady() || keys.length === 0) {
        return;
    }
    try {
        await getRedis().del(...keys);
    } catch (error) {
        console.warn('[Cache] del failed:', error.message);
    }
};

const delByPattern = async (pattern) => {
    if (!isRedisReady()) {
        return;
    }
    const redis = getRedis();
    let cursor = '0';
    try {
        do {
            const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
            cursor = nextCursor;
            if (keys.length > 0) {
                await redis.del(...keys);
            }
        } while (cursor !== '0');
    } catch (error) {
        console.warn('[Cache] scan/del failed:', pattern, error.message);
    }
};

/**
 * Cache-aside with optional single-flight lock to reduce stampede on hot keys.
 */
const getOrSet = async (key, ttlSeconds, factory, lockSeconds = 15) => {
    const cached = await get(key);
    if (cached !== undefined) {
        return cached;
    }

    const lockKey = `${key}:lock`;
    let acquired = false;

    if (isRedisReady()) {
        try {
            const result = await getRedis().set(lockKey, '1', 'EX', lockSeconds, 'NX');
            acquired = result === 'OK';
        } catch {
            acquired = true;
        }
    } else {
        acquired = true;
    }

    if (!acquired) {
        for (let i = 0; i < 8; i += 1) {
            await new Promise((resolve) => { setTimeout(resolve, 80 * (i + 1)); });
            const retry = await get(key);
            if (retry !== undefined) {
                return retry;
            }
        }
    }

    try {
        const value = await factory();
        await set(key, value, ttlSeconds);
        return value;
    } finally {
        if (isRedisReady() && acquired) {
            await del(lockKey);
        }
    }
};

module.exports = {
    get,
    set,
    del,
    delByPattern,
    getOrSet,
    defaultTtlSeconds,
};
