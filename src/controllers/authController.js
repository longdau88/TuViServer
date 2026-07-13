const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const tokenSecret = process.env.JWT_SECRET;
const tokenExpiresIn = Number(process.env.TOKEN_EXPIRES_IN || '1292400');
const authUsername = process.env.AUTH_USERNAME;
const authPassword = process.env.AUTH_PASSWORD;

if (!tokenSecret) {
    throw new Error('JWT_SECRET must be set in .env');
}

exports.getToken = (req, res) => {
    const { grant_type, username, password } = req.body;

    if (grant_type !== 'password') {
        return res.status(400).json({ error: 'unsupported_grant_type' });
    }

    if (!username || !password) {
        return res.status(400).json({ error: 'invalid_request', error_description: 'username and password are required' });
    }

    if (username !== authUsername || password !== authPassword) {
        return res.status(401).json({ error: 'invalid_client' });
    }

    const payload = {
        sub: username,
        scopes: [],
    };

    const accessToken = jwt.sign(payload, tokenSecret, {
        expiresIn: tokenExpiresIn,
    });

    return res.json({
        token_type: 'Bearer',
        expires_in: tokenExpiresIn,
        access_token: accessToken,
    });
};
