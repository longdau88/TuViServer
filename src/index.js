const cluster = require('cluster');
const os = require('os');
const dotenv = require('dotenv');

dotenv.config();

if (cluster.isPrimary) {
    // Calculate optimal workers based on Hardware Configuration (Auto-Adaptive)
    const FREE_RAM_GB = os.freemem() / (1024 ** 3);
    const AVAILABLE_RAM_GB = Math.max(0, FREE_RAM_GB - 1); // Reserve 1GB for OS padding
    const RAM_WORKER_CAP = Math.floor(AVAILABLE_RAM_GB / 2.5); // 2.5GB per worker (safe margin for LLM + VectorDB spike during load)
    const CPU_CORES = os.cpus().length;
    
    // Cap workers at the minimum of available RAM slots and CPU Cores, minimum 1 worker
    const numCPUs = Math.max(1, Math.min(CPU_CORES, RAM_WORKER_CAP));
    
    console.log(`[Master] Hardware Detected: ${CPU_CORES} Cores, ${FREE_RAM_GB.toFixed(1)}GB Free RAM`);
    console.log(`[Master] Primary process ${process.pid} is running. Optimal Workers: ${numCPUs}`);
    
    // Initialize database only once in the master process
    const { createUsersTable } = require('./models/userModel');
    
    createUsersTable()
        .then(() => {
            console.log(`[Master] Database initialized. Forking ${numCPUs} workers...`);
            for (let i = 0; i < numCPUs; i++) {
                // Stagger forks by 2000ms to prevent race conditions during node-llama-cpp binary tests and memory spikes
                setTimeout(() => cluster.fork(), i * 2000);
            }
        })
        .catch((error) => {
            console.error('[Master] Failed to initialize database:', error);
            console.log(`[Master] Forking ${numCPUs} workers anyway...`);
            for (let i = 0; i < numCPUs; i++) {
                setTimeout(() => cluster.fork(), i * 2000);
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
