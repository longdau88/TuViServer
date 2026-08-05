const cluster = require('cluster');
const os = require('os');
const dotenv = require('dotenv');

dotenv.config();

if (cluster.isPrimary) {
    const numCPUs = os.cpus().length;
    console.log(`[Master] Primary process ${process.pid} is running`);
    
    // Initialize database only once in the master process
    const { createUsersTable } = require('./models/userModel');
    
    createUsersTable()
        .then(() => {
            console.log(`[Master] Database initialized. Forking ${numCPUs} workers...`);
            for (let i = 0; i < numCPUs; i++) {
                cluster.fork();
            }
        })
        .catch((error) => {
            console.error('[Master] Failed to initialize database:', error);
            console.log(`[Master] Forking ${numCPUs} workers anyway...`);
            for (let i = 0; i < numCPUs; i++) {
                cluster.fork();
            }
        });

    // Auto-restart dead workers
    cluster.on('exit', (worker, code, signal) => {
        console.warn(`[Master] Worker ${worker.process.pid} died. Forking a new one...`);
        cluster.fork();
    });
} else {
    const app = require('./app');
    const { connectRedis } = require('./config/redis');

    const port = process.env.PORT || 3000;

    const startServer = (redisReady) => {
        app.listen(port, () => {
            const redisNote = redisReady ? 'redis ok' : 'redis off';
            console.log(`[Worker ${process.pid}] Server running at http://localhost:${port} (${redisNote})`);
        });
    };

    // Each worker connects to Redis and starts listening
    connectRedis()
        .then((redisReady) => {
            startServer(redisReady);
        })
        .catch((error) => {
            console.error(`[Worker ${process.pid}] Redis connect error:`, error);
            startServer(false);
        });
}
