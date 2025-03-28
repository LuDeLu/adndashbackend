/**
 * Script para crear la tabla de notificaciones
 * Ejecutar con: node back/create-notifications-table.js
 */

const mysql = require("mysql2/promise")
require("dotenv").config()

async function main() {
  // Configuración de la conexión a la base de datos
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })

  console.log("Conectado a la base de datos")

  try {
    // Verificar si existe la tabla notifications
    const [tables] = await connection.query(
      `
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'notifications'
    `,
      [process.env.DB_NAME],
    )

    if (tables.length === 0) {
      console.log("⚠️ La tabla notifications no existe. Creándola...")

      // Crear la tabla si no existe
      await connection.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id bigint UNSIGNED NOT NULL AUTO_INCREMENT,
          user_id int NOT NULL,
          message varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
          type enum('info','warning','success','error') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'info',
          module enum('clientes','proyectos','calendario','obras','postventa','sistema','estadisticas','documentos') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'sistema',
          link varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
          \`read\` tinyint(1) NOT NULL DEFAULT '0',
          created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_user_id (user_id),
          KEY idx_read (\`read\`),
          KEY idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
      `)
      console.log("✅ Tabla notifications creada correctamente")
    } else {
      console.log("✅ La tabla notifications existe")
    }

    // Crear notificaciones de prueba
    const [users] = await connection.query("SELECT id FROM users LIMIT 5")

    if (users.length > 0) {
      console.log("Creando notificaciones de prueba para los usuarios...")

      for (const user of users) {
        // Crear 3 notificaciones para cada usuario
        await connection.query(
          `
          INSERT INTO notifications (user_id, message, type, module, link, \`read\`, created_at)
          VALUES 
            (?, 'Bienvenido al sistema de notificaciones', 'info', 'sistema', '/dashboard', 0, NOW()),
            (?, 'Tienes un nuevo mensaje', 'success', 'clientes', '/clientes', 0, NOW()),
            (?, 'Recordatorio: Reunión mañana', 'warning', 'calendario', '/calendario', 0, NOW())
        `,
          [user.id, user.id, user.id],
        )
      }

      console.log("✅ Notificaciones de prueba creadas correctamente")
    }

    console.log("\n✅ Configuración completada. El sistema de notificaciones está listo para usar.")
  } catch (error) {
    console.error("❌ Error durante la configuración:", error)
  } finally {
    await connection.end()
  }
}

main().catch(console.error)

