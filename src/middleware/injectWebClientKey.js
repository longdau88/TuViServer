const fs = require('fs');
const path = require('path');

const injectWebClientKey = (req, res, next) => {
    const webClientKey = process.env.WEB_CLIENT_KEY || '';
    const indexPath = path.join(__dirname, '..', '..', 'public', 'index.html');

    fs.readFile(indexPath, 'utf8', (error, html) => {
        if (error) {
            return next();
        }

        const rendered = html.replace(
            /content="__WEB_CLIENT_KEY__"/,
            `content="${webClientKey.replace(/"/g, '')}"`,
        );
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        return res.send(rendered);
    });
};

module.exports = {
    injectWebClientKey,
};
