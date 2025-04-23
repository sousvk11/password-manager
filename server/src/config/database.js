require('dotenv').config({ path: './config/.env' });

module.exports = {
  development: {
    username: process.env.DB_USER || 'svk',
    password: process.env.DB_PASSWORD || 'svk',
    database: process.env.DB_NAME || 'password_manager',
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: console.log
  },
  test: {
    username: process.env.DB_USER || 'svk',
    password: process.env.DB_PASSWORD || 'svk',
    database: process.env.DB_NAME || 'password_manager_test',
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: false
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false
  }
};
