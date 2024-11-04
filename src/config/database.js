const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'adndash',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool;

async function initializePool() {
  try {
    pool = mysql.createPool(dbConfig);
    // Test the connection
    await pool.getConnection();
    console.log('Database connection established successfully');
  } catch (error) {
    console.error('Error initializing database pool:', error);
    throw error;
  }
}

function getPool() {
  if (!pool) {
    throw new Error('Database pool not initialized');
  }
  return pool;
}

module.exports = {
  initializePool,
  getPool
};