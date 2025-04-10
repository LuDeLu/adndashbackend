const { getPool } = require("../config/database")

async function createFloorTables() {
  const pool = getPool()
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    // Check if floors table exists
    const [floorsTableExists] = await connection.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'floors'
    `)

    if (floorsTableExists.length === 0) {
      console.log("Creating floors table...")
      await connection.query(`
        CREATE TABLE floors (
          id INT UNSIGNED NOT NULL AUTO_INCREMENT,
          project_id BIGINT UNSIGNED NOT NULL,
          floor_number INT NOT NULL,
          view_box VARCHAR(50) DEFAULT '0 0 3200 2400',
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY unique_floor_project (project_id, floor_number),
          CONSTRAINT floors_ibfk_1 FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      `)
    }

    // Check if apartments table exists
    const [apartmentsTableExists] = await connection.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'apartments'
    `)

    if (apartmentsTableExists.length === 0) {
      console.log("Creating apartments table...")
      await connection.query(`
        CREATE TABLE apartments (
          id INT UNSIGNED NOT NULL AUTO_INCREMENT,
          floor_id INT UNSIGNED NOT NULL,
          apartment_id VARCHAR(10) COLLATE utf8mb4_general_ci NOT NULL,
          status ENUM('libre','reservado','ocupado','bloqueado') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'libre',
          price VARCHAR(50) COLLATE utf8mb4_general_ci NOT NULL,
          surface VARCHAR(50) COLLATE utf8mb4_general_ci NOT NULL,
          buyer VARCHAR(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
          phone VARCHAR(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
          email VARCHAR(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
          reservation_date DATE DEFAULT NULL,
          svg_path TEXT COLLATE utf8mb4_general_ci NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY unique_apartment_floor (floor_id,apartment_id),
          CONSTRAINT apartments_ibfk_1 FOREIGN KEY (floor_id) REFERENCES floors (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      `)
    }

    // Check if parking_spots table exists
    const [parkingSpotsTableExists] = await connection.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parking_spots'
    `)

    if (parkingSpotsTableExists.length === 0) {
      console.log("Creating parking_spots table...")
      await connection.query(`
        CREATE TABLE parking_spots (
          id INT UNSIGNED NOT NULL AUTO_INCREMENT,
          project_id BIGINT UNSIGNED NOT NULL,
          parking_id VARCHAR(10) COLLATE utf8mb4_general_ci NOT NULL,
          level INT NOT NULL DEFAULT 1,
          status ENUM('libre','ocupado') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'libre',
          assigned_to VARCHAR(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
          svg_path TEXT COLLATE utf8mb4_general_ci NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY unique_parking_project (project_id,parking_id,level),
          CONSTRAINT parking_spots_ibfk_1 FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      `)
    }

    // Check if activity_logs table exists
    const [activityLogsTableExists] = await connection.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'activity_logs'
    `)

    if (activityLogsTableExists.length === 0) {
      console.log("Creating activity_logs table...")
      await connection.query(`
        CREATE TABLE activity_logs (
          id INT UNSIGNED NOT NULL AUTO_INCREMENT,
          user_id INT NOT NULL,
          project_id BIGINT UNSIGNED NOT NULL,
          action_type VARCHAR(50) COLLATE utf8mb4_general_ci NOT NULL,
          description TEXT COLLATE utf8mb4_general_ci NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY user_id (user_id),
          KEY project_id (project_id),
          CONSTRAINT activity_logs_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id),
          CONSTRAINT activity_logs_ibfk_2 FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      `)
    }

    await connection.commit()
    console.log("Floor tables created successfully")
  } catch (error) {
    await connection.rollback()
    console.error("Error creating floor tables:", error)
    throw error
  } finally {
    connection.release()
  }
}

module.exports = { createFloorTables }
