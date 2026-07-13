const dotenv = require('dotenv');
const app = require('./app');
const { createUsersTable } = require('./models/userModel');

dotenv.config();

const port = process.env.PORT || 3000;

createUsersTable()
    .then(() => {
        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}`);
        });
    })
    .catch((error) => {
        console.error('Failed to initialize database:', error);
        process.exit(1);
    });
