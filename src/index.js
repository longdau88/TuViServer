const dotenv = require('dotenv');
const app = require('./app');
const { createUsersTable } = require('./models/userModel');

dotenv.config();

const port = process.env.PORT || 3000;

const startServer = (dbReady) => {
    app.listen(port, () => {
        if (dbReady) {
            console.log(`Server running at http://localhost:${port}`);
            return;
        }

        console.warn(`Server running at http://localhost:${port} (database unavailable)`);
    });
};

createUsersTable()
    .then(() => {
        startServer(true);
    })
    .catch((error) => {
        console.error('Failed to initialize database:', error);
        startServer(false);
    });
