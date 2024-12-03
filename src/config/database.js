const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'marianod.sg-host.com',
  user: process.env.DB_USER || 'uypqisqxp0b0g',
  password: process.env.DB_PASSWORD || 'Calpol!59',
  database: process.env.DB_NAME || 'dbxnn6gxt1mvlh',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool;

async function initializePool() {
  try {
    pool = mysql.createPool(dbConfig);
    // Prueba la conexión
    await pool.getConnection();
    console.log('Conexión a la base de datos establecida con éxito');
  } catch (error) {
    console.error('Error al inicializar el pool de la base de datos:', error);
    throw error;
  }
}

function getPool() {
  if (!pool) {
    throw new Error('Pool de base de datos no inicializado');
  }
  return pool;
}

module.exports = {
  initializePool,
  getPool
};

