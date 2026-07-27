const cacheService = require('./cacheService');

const PREFIX = 'tuvi';

const keys = {
    userByDevice: (deviceId) => `${PREFIX}:user:device:${deviceId}`,
    userById: (userId) => `${PREFIX}:user:id:${userId}`,
    profileDisplay: (userId) => `${PREFIX}:display:${userId}`,
};

const userTtl = () => Number(process.env.CACHE_USER_TTL_SECONDS) || cacheService.defaultTtlSeconds();
const displayTtl = () => Number(process.env.CACHE_DISPLAY_TTL_SECONDS) || 600;

const invalidateUser = async (userId, deviceId) => {
    const toDelete = [];
    if (userId) {
        toDelete.push(keys.userById(userId), keys.profileDisplay(userId));
    }
    if (deviceId) {
        toDelete.push(keys.userByDevice(deviceId));
    }
    await cacheService.del(...toDelete);
};

module.exports = {
    keys,
    userTtl,
    displayTtl,
    invalidateUser,
};
