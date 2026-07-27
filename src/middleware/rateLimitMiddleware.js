const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { getRedis } = require('../config/redis');

const createStore = (prefix) => {
    if (process.env.REDIS_ENABLED === 'false') {
        return undefined;
    }
    const redis = getRedis();
    if (!redis) {
        return undefined;
    }
    return new RedisStore({
        sendCommand: (...args) => redis.call(...args),
        prefix: `tuvi:rl:${prefix}:`,
    });
};

const standardHeaders = true;
const legacyHeaders = false;

const apiLimiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000,
    limit: Number(process.env.RATE_LIMIT_MAX) || 120,
    standardHeaders,
    legacyHeaders,
    store: createStore('api'),
    message: {
        status: 429,
        error: 1,
        message: 'Too many requests, please try again later',
        data: {},
    },
    skip: (req) => req.path === '/health',
});

const heavyReadLimiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_HEAVY_WINDOW_MS) || 60 * 1000,
    limit: Number(process.env.RATE_LIMIT_HEAVY_MAX) || 40,
    standardHeaders,
    legacyHeaders,
    store: createStore('heavy'),
    message: {
        status: 429,
        error: 1,
        message: 'Too many chart requests, please slow down',
        data: {},
    },
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.RATE_LIMIT_AUTH_MAX) || 30,
    standardHeaders,
    legacyHeaders,
    store: createStore('auth'),
    message: {
        status: 429,
        error: 1,
        message: 'Too many authentication attempts',
        data: {},
    },
});

module.exports = {
    apiLimiter,
    heavyReadLimiter,
    authLimiter,
};
