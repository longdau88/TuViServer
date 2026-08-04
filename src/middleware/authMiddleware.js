const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const tokenSecret = process.env.JWT_SECRET;

if (!tokenSecret) {
    throw new Error('JWT_SECRET must be set in .env');
}

exports.authenticateToken = (req, res, next) => {
    const authorization = req.headers.authorization;
    const token = authorization && authorization.startsWith('Bearer ')
        ? authorization.slice(7)
        : null;

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    jwt.verify(token, tokenSecret, { algorithms: ['HS256'] }, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }

        req.user = decoded;
        next();
    });
};

exports.requireAdmin = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    // Cho phép token hệ thống web-ui hoặc token có role/sub admin
    if (req.user.role === 'admin' || req.user.sub === 'admin' || req.user.sub === 'web-ui') {
        return next();
    }

    try {
        const { findUserById, findUserByEmail } = require('../models/userModel');
        let user = null;
        if (req.user.id) user = await findUserById(req.user.id);
        else if (req.user.email) user = await findUserByEmail(req.user.email);

        if (user && user.role === 'admin') {
            return next();
        }
    } catch (e) {
        console.error('requireAdmin check error:', e);
    }

    return res.status(403).json({ message: 'Forbidden: Yêu cầu quyền Admin' });
};
