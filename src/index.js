const dotenv = require('dotenv');
const app = require('./app');
const { createUsersTable } = require('./models/userModel');
const { connectRedis } = require('./config/redis');

dotenv.config();

const port = process.env.PORT || 3000;

const startServer = (dbReady, redisReady) => {
    app.listen(port, () => {
        const redisNote = redisReady ? 'redis ok' : 'redis off';
        if (dbReady) {
            console.log(`Server running at http://localhost:${port} (${redisNote})`);
            return;
        }

        console.warn(`Server running at http://localhost:${port} (database unavailable, ${redisNote})`);
    });
};

createUsersTable()
    .then(async () => {
        const redisReady = await connectRedis();
        startServer(true, redisReady);
    })
    .catch(async (error) => {
        console.error('Failed to initialize database:', error);
        const redisReady = await connectRedis();
        startServer(false, redisReady);
    });
