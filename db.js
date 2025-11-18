const mysql = require('mysql2');
// const logger = require('./utils/logger/logger'); // assuming logger is correctly configured
require('dotenv').config();

// Create a connection pool (better for performance than a single connection)
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hanshyundai',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Wrap pool with promise API
const db = pool.promise();

// Test the connection
db.getConnection()
  .then((connection) => {
    // logger.info('Connected to MySQL Database');
    console.log('Connected to MySQL Database');
    connection.release();
  })
  .catch((err) => {
    console.error('MySQL connection error:', err);
    // logger.error(`MySQL connection error: ${err.message}`);
  });

module.exports = db;
