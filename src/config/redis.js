const Redis = require('ioredis');
const dotenv = require('dotenv');

dotenv.config();

const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379;
const redisPassword = process.env.REDIS_PASSWORD || undefined;
const redisEnabled = process.env.REDIS_ENABLED !== 'false';

let client = null;
let ready = false;

const createClient = () => {
    if (!redisEnabled) {
        return null;
    }

    if (redisUrl) {
        return new Redis(redisUrl, {
            maxRetriesPerRequest: 2,
            enableReadyCheck: true,
            lazyConnect: true,
        });
    }

    return new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword,
        maxRetriesPerRequest: 2,
        enableReadyCheck: true,
        lazyConnect: true,
    });
};

const getRedis = () => {
    if (!redisEnabled) {
        return null;
    }
    if (!client) {
        client = createClient();
        if (client) {
            client.on('ready', () => {
                ready = true;
                console.log('[Redis] Connected');
            });
            client.on('error', (err) => {
                ready = false;
                console.warn('[Redis] Error:', err.message);
            });
            client.on('close', () => {
                ready = false;
            });
        }
    }
    return client;
};

const connectRedis = async () => {
    const redis = getRedis();
    if (!redis) {
        return false;
    }
    if (redis.status === 'ready') {
        ready = true;
        return true;
    }
    try {
        await redis.connect();
        ready = true;
        return true;
    } catch (error) {
        ready = false;
        console.warn('[Redis] Unavailable, running without cache:', error.message);
        return false;
    }
};

const isRedisReady = () => Boolean(redisEnabled && client && ready && client.status === 'ready');

const closeRedis = async () => {
    if (!client) {
        return;
    }
    try {
        await client.quit();
    } catch {
        client.disconnect();
    }
    client = null;
    ready = false;
};

module.exports = {
    getRedis,
    connectRedis,
    isRedisReady,
    closeRedis,
};
