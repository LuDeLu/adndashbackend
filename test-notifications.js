/**
 * Script para probar el sistema de notificaciones
 * Ejecutar con: node backend/scripts/test-notifications.js
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
    // 1. Verificar si existe la tabla notifications
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
          module enum('clientes','proyectos','calendario','obras','postventa','sistema') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'sistema',
          link varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
          \`read\` tinyint(1) NOT NULL DEFAULT '0',
          created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_user_id (user_id),
          KEY idx_read (\`read\`),
          KEY idx_created_at (created_at),
          CONSTRAINT notifications_user_id_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
      `)
      console.log("✅ Tabla notifications creada correctamente")
    } else {
      console.log("✅ La tabla notifications existe")
    }

    // 2. Verificar si hay notificaciones en la tabla
    const [notificationsCount] = await connection.query("SELECT COUNT(*) as count FROM notifications")
    console.log(`📊 Hay ${notificationsCount[0].count} notificaciones en la base de datos`)

    // 3. Verificar si hay usuarios en la tabla users
    const [users] = await connection.query("SELECT id, email, nombre, rol FROM users LIMIT 5")
    console.log(`👥 Usuarios disponibles: ${users.length}`)
    users.forEach((user) => {
      console.log(`  - ID: ${user.id}, Email: ${user.email}, Nombre: ${user.nombre}, Rol: ${user.rol}`)
    })

    // 4. Crear notificaciones de prueba para todos los usuarios
    if (notificationsCount[0].count === 0) {
      console.log("⚠️ No hay notificaciones. Creando notificaciones de prueba...")

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

    // 5. Mostrar algunas notificaciones para verificar
    const [sampleNotifications] = await connection.query(`
      SELECT n.*, u.email as user_email 
      FROM notifications n 
      JOIN users u ON n.user_id = u.id 
      ORDER BY n.created_at DESC 
      LIMIT 5
    `)

    console.log("📬 Muestra de notificaciones:")
    sampleNotifications.forEach((notification) => {
      console.log(
        `  - ID: ${notification.id}, Usuario: ${notification.user_email}, Mensaje: ${notification.message}, Leída: ${notification.read === 1 ? "Sí" : "No"}`,
      )
    })

    console.log("\n✅ Prueba completada. El sistema de notificaciones está configurado correctamente.")
    console.log("Si sigues sin ver notificaciones en el frontend, revisa la consola del navegador para errores.")
  } catch (error) {
    console.error("❌ Error durante la prueba:", error)
  } finally {
    await connection.end()
  }
}

main().catch(console.error)

