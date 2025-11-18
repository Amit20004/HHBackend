const mysql = require('mysql2');
// const logger = require('./utils/logger/logger'); // assuming logger is correctly configured

// Create a connection pool (better for performance than a single connection)
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '' ,
  database: 'hanshyundai',
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
