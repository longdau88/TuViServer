const express = require('express');
const path = require('path');
const routes = require('./routes');

const app = express();
const publicDir = path.join(__dirname, '..', 'public');

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(express.static(publicDir));

app.use('/', routes);

app.use((req, res) => {
    res.status(404).json({ message: 'Not Found' });
});

module.exports = app;
