const express = require('express');
const path = require('path');
const cors = require('cors');
const routes = require('./routes');
const { apiLimiter } = require('./middleware/rateLimitMiddleware');

const app = express();
const publicDir = path.join(__dirname, '..', 'public');

app.set('trust proxy', 1);

// Enable CORS for all routes
app.use(cors());

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(express.static(publicDir));

app.get('/favicon.ico', (req, res) => res.sendFile(path.join(publicDir, 'favicon.svg')));
app.get('/create-user', (req, res) => res.sendFile(path.join(publicDir, 'create-user.html')));
app.get('/update-user', (req, res) => res.sendFile(path.join(publicDir, 'update-user.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(publicDir, 'admin.html')));
app.get('/tu-vi-doi', (req, res) => res.sendFile(path.join(publicDir, 'tu-vi-doi.html')));
app.get('/van-han-realtime', (req, res) => res.sendFile(path.join(publicDir, 'van-han-realtime.html')));
app.get('/chon-ngay-tot', (req, res) => res.sendFile(path.join(publicDir, 'chon-ngay-tot.html')));
app.get('/tro-ly-ai', (req, res) => res.sendFile(path.join(publicDir, 'tro-ly-ai.html')));
app.get('/boc-que-hang-ngay', (req, res) => res.sendFile(path.join(publicDir, 'boc-que-hang-ngay.html')));


app.use(apiLimiter);
app.use('/', routes);

app.use((req, res) => {
    res.status(404).json({ message: 'Not Found' });
});

module.exports = app;
