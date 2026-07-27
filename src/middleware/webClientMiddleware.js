const { isProduction } = require('../config/security');
const { safeEqual } = require('../utils/secureCompare');

const getWebClientKey = () => process.env.WEB_CLIENT_KEY || '';

exports.requireWebClientKey = (req, res, next) => {
    const configuredKey = getWebClientKey();

    if (!isProduction()) {
        return next();
    }

    if (!configuredKey) {
        return res.status(503).json({
            status: 503,
            error: 1,
            message: 'Web token endpoint is disabled',
            data: {},
        });
    }

    const providedKey = req.get('x-web-client-key') || '';
    if (!safeEqual(providedKey, configuredKey)) {
        return res.status(403).json({
            status: 403,
            error: 1,
            message: 'Forbidden',
            data: {},
        });
    }

    return next();
};

module.exports = exports;
