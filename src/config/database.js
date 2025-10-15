const mysql = require("mysql2/promise")

const dbConfig = {
  host: process.env.DB_HOST || "35.212.84.160",
  user: process.env.DB_USER || "uqmlgkm2pgggc",
  password: process.env.DB_PASSWORD || "Calpol!59",
  database: process.env.DB_NAME || "dbov5rhwzzsxsr",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
}

let pool

async function initializePool() {
  try {
    if (!pool) {
      // Solo inicializar si no existe
      pool = mysql.createPool(dbConfig)
      // Prueba la conexión
      await pool.getConnection()
      console.log("Conexión a la base de datos establecida con éxito✅ Database pool initialized successfully")
    }
  } catch (error) {
    console.error("Error al inicializar el pool de la base de datos:", error)
    throw error
  }
}

function getPool() {
  if (!pool) {
    throw new Error("Pool de base de datos no inicializado. Llama a initializePool() primero.")
  }
  return pool
}

module.exports = {
  initializePool,
  getPool,
}
