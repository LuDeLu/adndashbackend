const { getPool, initializePool } = require("../config/database")

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
          floor_name VARCHAR(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
          view_box VARCHAR(50) DEFAULT '0 0 3200 2400',
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY unique_floor_project (project_id, floor_number),
          CONSTRAINT floors_ibfk_1 FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      `)
    } else {
      console.log("Floors table already exists. Checking for updates...")
      // Add floor_name column if it doesn't exist
      const [columns] = await connection.query(`
        SHOW COLUMNS FROM floors LIKE 'floor_name'
      `)
      if (columns.length === 0) {
        await connection.query(`
          ALTER TABLE floors ADD COLUMN floor_name VARCHAR(50) COLLATE utf8mb4_general_ci DEFAULT NULL
        `)
        console.log("Added 'floor_name' column to 'floors' table.")
      }
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
          apartment_name VARCHAR(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
          status ENUM('available','reserved','sold','blocked') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'available',
          price DECIMAL(15,2) NOT NULL,
          area DECIMAL(10,2) NOT NULL,
          buyer_name VARCHAR(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
          buyer_phone VARCHAR(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
          buyer_email VARCHAR(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
          reservation_date DATE DEFAULT NULL,
          notes TEXT COLLATE utf8mb4_general_ci DEFAULT NULL,
          svg_path TEXT COLLATE utf8mb4_general_ci NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY unique_apartment_floor (floor_id,apartment_id),
          CONSTRAINT apartments_ibfk_1 FOREIGN KEY (floor_id) REFERENCES floors (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      `)
    } else {
      console.log("Apartments table already exists. Checking for updates...")
      // Add apartment_name and notes columns if they don't exist
      const [columns] = await connection.query(`
        SHOW COLUMNS FROM apartments WHERE Field IN ('apartment_name', 'notes')
      `)
      const hasApartmentName = columns.some((col) => col.Field === "apartment_name")
      const hasNotes = columns.some((col) => col.Field === "notes")

      if (!hasApartmentName) {
        await connection.query(`
          ALTER TABLE apartments ADD COLUMN apartment_name VARCHAR(50) COLLATE utf8mb4_general_ci DEFAULT NULL
        `)
        console.log("Added 'apartment_name' column to 'apartments' table.")
      }
      if (!hasNotes) {
        await connection.query(`
          ALTER TABLE apartments ADD COLUMN notes TEXT COLLATE utf8mb4_general_ci DEFAULT NULL
        `)
        console.log("Added 'notes' column to 'apartments' table.")
      }
      // Change price and surface to DECIMAL if they are VARCHAR
      const [priceColumn] = await connection.query(`SHOW COLUMNS FROM apartments LIKE 'price'`)
      if (priceColumn.length > 0 && priceColumn[0].Type.includes("varchar")) {
        await connection.query(`ALTER TABLE apartments MODIFY COLUMN price DECIMAL(15,2) NOT NULL`)
        console.log("Changed 'price' column to DECIMAL(15,2) in 'apartments' table.")
      }
      const [areaColumn] = await connection.query(`SHOW COLUMNS FROM apartments LIKE 'area'`)
      if (areaColumn.length > 0 && areaColumn[0].Type.includes("varchar")) {
        await connection.query(`ALTER TABLE apartments MODIFY COLUMN area DECIMAL(10,2) NOT NULL`)
        console.log("Changed 'area' column to DECIMAL(10,2) in 'apartments' table.")
      }
      // Rename buyer, phone, email columns
      const [buyerColumn] = await connection.query(`SHOW COLUMNS FROM apartments LIKE 'buyer'`)
      if (buyerColumn.length > 0) {
        await connection.query(
          `ALTER TABLE apartments CHANGE COLUMN buyer buyer_name VARCHAR(100) COLLATE utf8mb4_general_ci DEFAULT NULL`,
        )
        console.log("Renamed 'buyer' column to 'buyer_name' in 'apartments' table.")
      }
      const [phoneColumn] = await connection.query(`SHOW COLUMNS FROM apartments LIKE 'phone'`)
      if (phoneColumn.length > 0) {
        await connection.query(
          `ALTER TABLE apartments CHANGE COLUMN phone buyer_phone VARCHAR(50) COLLATE utf8mb4_general_ci DEFAULT NULL`,
        )
        console.log("Renamed 'phone' column to 'buyer_phone' in 'apartments' table.")
      }
      const [emailColumn] = await connection.query(`SHOW COLUMNS FROM apartments LIKE 'email'`)
      if (emailColumn.length > 0) {
        await connection.query(
          `ALTER TABLE apartments CHANGE COLUMN email buyer_email VARCHAR(100) COLLATE utf8mb4_general_ci DEFAULT NULL`,
        )
        console.log("Renamed 'email' column to 'buyer_email' in 'apartments' table.")
      }
      // Update ENUM values
      const [statusColumn] = await connection.query(`SHOW COLUMNS FROM apartments LIKE 'status'`)
      if (statusColumn.length > 0 && statusColumn[0].Type.includes("ENUM('libre','reservado','ocupado','bloqueado')")) {
        await connection.query(
          `ALTER TABLE apartments MODIFY COLUMN status ENUM('available','reserved','sold','blocked') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'available'`,
        )
        console.log("Updated 'status' ENUM values in 'apartments' table.")
      }
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
          apartment_id INT UNSIGNED NOT NULL,
          parking_id VARCHAR(10) COLLATE utf8mb4_general_ci NOT NULL,
          level INT NOT NULL DEFAULT 1,
          status ENUM('available','occupied') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'available',
          notes VARCHAR(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
          svg_path TEXT COLLATE utf8mb4_general_ci NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY unique_parking_apartment (apartment_id,parking_id,level),
          CONSTRAINT parking_spots_ibfk_1 FOREIGN KEY (apartment_id) REFERENCES apartments (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      `)
    } else {
      console.log("Parking_spots table already exists. Checking for updates...")
      // Check if project_id column exists and drop it if it does
      const [projectIdColumn] = await connection.query(`
        SHOW COLUMNS FROM parking_spots LIKE 'project_id'
      `)
      if (projectIdColumn.length > 0) {
        await connection.query(`
          ALTER TABLE parking_spots DROP FOREIGN KEY parking_spots_ibfk_1
        `)
        await connection.query(`
          ALTER TABLE parking_spots DROP COLUMN project_id
        `)
        console.log("Dropped 'project_id' column from 'parking_spots' table.")
      }

      // Add apartment_id column if it doesn't exist and add foreign key
      const [apartmentIdColumn] = await connection.query(`
        SHOW COLUMNS FROM parking_spots LIKE 'apartment_id'
      `)
      if (apartmentIdColumn.length === 0) {
        await connection.query(`
          ALTER TABLE parking_spots ADD COLUMN apartment_id INT UNSIGNED NOT NULL AFTER id
        `)
        await connection.query(`
          ALTER TABLE parking_spots ADD CONSTRAINT parking_spots_ibfk_1 FOREIGN KEY (apartment_id) REFERENCES apartments (id) ON DELETE CASCADE
        `)
        console.log("Added 'apartment_id' column and foreign key to 'parking_spots' table.")
      }

      // Add notes column if it doesn't exist
      const [notesColumn] = await connection.query(`
        SHOW COLUMNS FROM parking_spots LIKE 'notes'
      `)
      if (notesColumn.length === 0) {
        await connection.query(`
          ALTER TABLE parking_spots ADD COLUMN notes VARCHAR(255) COLLATE utf8mb4_general_ci DEFAULT NULL
        `)
        console.log("Added 'notes' column to 'parking_spots' table.")
      }

      // Update ENUM values
      const [statusColumn] = await connection.query(`SHOW COLUMNS FROM parking_spots LIKE 'status'`)
      if (statusColumn.length > 0 && statusColumn[0].Type.includes("ENUM('libre','ocupado')")) {
        await connection.query(
          `ALTER TABLE parking_spots MODIFY COLUMN status ENUM('available','occupied') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'available'`,
        )
        console.log("Updated 'status' ENUM values in 'parking_spots' table.")
      }

      // Update unique key
      const [uniqueKey] = await connection.query(`
        SELECT CONSTRAINT_NAME
        FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parking_spots' AND CONSTRAINT_TYPE = 'UNIQUE' AND CONSTRAINT_NAME LIKE 'unique_parking_project%'
      `)
      if (uniqueKey.length > 0) {
        await connection.query(`ALTER TABLE parking_spots DROP INDEX ${uniqueKey[0].CONSTRAINT_NAME}`)
        console.log(`Dropped old unique key ${uniqueKey[0].CONSTRAINT_NAME} from 'parking_spots' table.`)
      }
      const [newUniqueKey] = await connection.query(`
        SELECT CONSTRAINT_NAME
        FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parking_spots' AND CONSTRAINT_TYPE = 'UNIQUE' AND CONSTRAINT_NAME = 'unique_parking_apartment'
      `)
      if (newUniqueKey.length === 0) {
        await connection.query(
          `ALTER TABLE parking_spots ADD UNIQUE KEY unique_parking_apartment (apartment_id,parking_id,level)`,
        )
        console.log("Added new unique key 'unique_parking_apartment' to 'parking_spots' table.")
      }
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
    } else {
      console.log("Activity_logs table already exists.")
    }

    await connection.commit()
    console.log("Database schema updated successfully.")
  } catch (error) {
    await connection.rollback()
    console.error("Error updating database schema:", error)
    throw error
  } finally {
    connection.release()
  }
}

module.exports = { createFloorTables }

// Añade esto al final del archivo para ejecutarlo directamente
if (require.main === module) {
  async function runMigrationScript() {
    try {
      await initializePool()
      await createFloorTables()
      console.log("Migración de tablas de pisos, apartamentos y cocheras completada.")
    } catch (error) {
      console.error("Error al ejecutar la migración:", error)
    } finally {
      // No cerrar el pool aquí si se usa en otras partes de la aplicación
    }
  }
  runMigrationScript()
}
