const helmet = require('helmet');
const {
    isProduction,
} = require('../config/security');

const applySecurityMiddleware = (app) => {
    app.disable('x-powered-by');

    app.use(helmet({
        contentSecurityPolicy: isProduction() ? {
            useDefaults: true,
            directives: {
                defaultSrc: ["'self'"],
                imgSrc: ["'self'", 'data:', 'https:'],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                connectSrc: ["'self'"],
                objectSrc: ["'none'"],
                frameAncestors: ["'none'"],
            },
        } : false,
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: 'same-site' },
    }));

    const allowedOrigins = (process.env.CORS_ORIGINS || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

    app.use((req, res, next) => {
        const origin = req.headers.origin;
        if (origin && allowedOrigins.includes(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Vary', 'Origin');
            res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Web-Client-Key');
        }

        if (req.method === 'OPTIONS') {
            return res.status(204).end();
        }

        return next();
    });
};

module.exports = {
    applySecurityMiddleware,
};
