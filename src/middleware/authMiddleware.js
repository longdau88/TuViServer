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

    jwt.verify(token, tokenSecret, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }

        req.user = decoded;
        next();
    });
};
