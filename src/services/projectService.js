const { getPool } = require("../config/database")
const fs = require("fs").promises

const projectService = {
  // Obtener todos los proyectos
  async getAllProjects() {
    const pool = getPool()
    try {
      const query = `
        SELECT 
          p.*,
          COUNT(DISTINCT f.id) as total_floors,
          COUNT(DISTINCT a.id) as total_apartments,
          COUNT(DISTINCT ps.id) as total_parking_spots
        FROM projects p
        LEFT JOIN floors f ON p.id = f.project_id
        LEFT JOIN apartments a ON f.id = a.floor_id
        LEFT JOIN parking_spots ps ON p.id = ps.project_id
        GROUP BY p.id
        ORDER BY p.name ASC
      `

      const [rows] = await pool.execute(query)

      // Parsear campos JSON de forma segura
      const parsedProjects = rows.map((project) => ({
        ...project,
        amenities: this.parseJsonField(project.amenities),
        unit_types: this.parseJsonField(project.unit_types),
        financial_options: this.parseJsonField(project.financial_options),
        parking_info: this.parseJsonObject(project.parking_info),
        promotions: this.parseJsonField(project.promotions),
        building_config: this.parseJsonObject(project.building_config),
        floors_config: this.parseJsonObject(project.floors_config),
        // Asegurar que los campos numéricos sean números
        available_units: Number(project.available_units) || 0,
        reserved_units: Number(project.reserved_units) || 0,
        sold_units: Number(project.sold_units) || 0,
        total_units: Number(project.total_units) || 0,
      }))

      return parsedProjects
    } catch (error) {
      console.error("Error getting projects:", error)
      throw new Error("Error getting projects: " + error.message)
    }
  },

  // Obtener proyecto por ID
  async getProjectById(projectId) {
    const pool = getPool()
    try {
      // Validar que projectId sea un número válido
      const id = Number.parseInt(projectId)
      if (!id || isNaN(id)) {
        throw new Error("ID de proyecto inválido")
      }

      console.log(`Querying database for project ID: ${id}`)
      const [rows] = await pool.execute("SELECT * FROM projects WHERE id = ?", [id])
      console.log(`Query result: ${rows.length} rows found`)

      if (rows.length === 0) {
        return null
      }

      // Parsear campos JSON de forma segura
      const project = {
        ...rows[0],
        amenities: this.parseJsonField(rows[0].amenities),
        unit_types: this.parseJsonField(rows[0].unit_types),
        financial_options: this.parseJsonField(rows[0].financial_options),
        parking_info: this.parseJsonObject(rows[0].parking_info),
        promotions: this.parseJsonField(rows[0].promotions),
        building_config: this.parseJsonObject(rows[0].building_config),
        floors_config: this.parseJsonObject(rows[0].floors_config),
      }

      return project
    } catch (error) {
      console.error("Error getting project:", error)
      throw new Error("Error getting project: " + error.message)
    }
  },

  // Crear nuevo proyecto
  async createProject(projectData) {
    const pool = getPool()
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      const {
        name,
        image,
        edificio,
        location,
        available_units = 0,
        reserved_units = 0,
        sold_units = 0,
        total_units = 0,
        brochure,
        amenities = [],
        unit_types = [],
        financial_options = [],
        floors_config = {},
        building_config = {},
        parking_config = {},
      } = projectData

      const query = `
        INSERT INTO projects (
          name, image, edificio, location, available_units, reserved_units, 
          sold_units, total_units, brochure, amenities, unit_types, 
          financial_options, floors_config, building_config, parking_config
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `

      const [result] = await connection.execute(query, [
        name,
        image,
        edificio,
        location,
        available_units,
        reserved_units,
        sold_units,
        total_units,
        brochure,
        JSON.stringify(amenities),
        JSON.stringify(unit_types),
        JSON.stringify(financial_options),
        JSON.stringify(floors_config),
        JSON.stringify(building_config),
        JSON.stringify(parking_config),
      ])

      await connection.commit()

      // Obtener el proyecto completo creado
      const [rows] = await connection.execute("SELECT * FROM projects WHERE id = ?", [result.insertId])
      return rows[0]
    } catch (error) {
      await connection.rollback()
      console.error("Error creating project:", error)
      throw new Error("Error creating project: " + error.message)
    } finally {
      connection.release()
    }
  },

  // Actualizar unidades del proyecto
  async updateProjectUnits(projectId, units) {
    const pool = getPool()
    try {
      // Validar que projectId sea un número válido
      const id = Number.parseInt(projectId)
      if (!id || isNaN(id)) {
        throw new Error("ID de proyecto inválido")
      }

      const query = `
        UPDATE projects 
        SET total_units = ?
        WHERE id = ?
      `

      await pool.execute(query, [units, id])
      return this.getProjectById(id)
    } catch (error) {
      console.error("Error updating project units:", error)
      throw new Error("Error updating project units: " + error.message)
    }
  },

  // Obtener estadísticas del proyecto
  async getProjectStats(projectId) {
    const pool = getPool()
    try {
      // Validar que projectId sea un número válido
      const id = Number.parseInt(projectId)
      if (!id || isNaN(id)) {
        throw new Error("ID de proyecto inválido")
      }

      const query = `
        SELECT 
          COUNT(CASE WHEN a.status = 'libre' THEN 1 END) as available_units,
          COUNT(CASE WHEN a.status = 'reservado' THEN 1 END) as reserved_units,
          COUNT(CASE WHEN a.status = 'ocupado' THEN 1 END) as sold_units,
          COUNT(a.id) as total_units
        FROM floors f
        LEFT JOIN apartments a ON f.id = a.floor_id
        WHERE f.project_id = ?
      `

      const [rows] = await pool.execute(query, [id])
      return rows[0] || { available_units: 0, reserved_units: 0, sold_units: 0, total_units: 0 }
    } catch (error) {
      console.error("Error getting project stats:", error)
      throw new Error("Error getting project stats: " + error.message)
    }
  },

  // Obtener estadísticas de un piso específico
  async getFloorStats(projectId, floorNumber) {
    const pool = getPool()
    try {
      // Validar que projectId sea un número válido
      const id = Number.parseInt(projectId)
      const floor = Number.parseInt(floorNumber)

      if (!id || isNaN(id)) {
        throw new Error("ID de proyecto inválido")
      }

      if (!floor || isNaN(floor)) {
        throw new Error("Número de piso inválido")
      }

      const query = `
        SELECT 
          COUNT(CASE WHEN a.status = 'libre' THEN 1 END) as availableUnits,
          COUNT(CASE WHEN a.status = 'reservado' THEN 1 END) as reservedUnits,
          COUNT(CASE WHEN a.status = 'ocupado' THEN 1 END) as soldUnits
        FROM floors f
        LEFT JOIN apartments a ON f.id = a.floor_id
        WHERE f.project_id = ? AND f.floor_number = ?
      `

      const [rows] = await pool.execute(query, [id, floor])
      return rows[0] || { availableUnits: 0, reservedUnits: 0, soldUnits: 0 }
    } catch (error) {
      console.error("Error getting floor stats:", error)
      throw new Error("Error getting floor stats: " + error.message)
    }
  },

  // Obtener configuración del proyecto
  async getProjectConfiguration(projectId) {
    const pool = getPool()
    try {
      // Validar que projectId sea un número válido
      const id = Number.parseInt(projectId)
      if (!id || isNaN(id)) {
        throw new Error("ID de proyecto inválido")
      }

      console.log(`Getting configuration for project ID: ${id}`)

      // Obtener proyecto principal
      const [projectRows] = await pool.execute("SELECT * FROM projects WHERE id = ?", [id])

      if (projectRows.length === 0) {
        throw new Error("Project not found")
      }

      // Obtener configuración de pisos específica del proyecto
      const [floorConfigRows] = await pool.execute(
        `SELECT * FROM project_floor_config WHERE project_id = ? ORDER BY floor_number`,
        [id],
      )

      // Obtener archivos específicos del proyecto
      const [filesRows] = await pool.execute(
        `SELECT * FROM project_files WHERE project_id = ? ORDER BY file_type, floor_number, apartment_id`,
        [id],
      )

      // Parsear configuraciones JSON
      const project = {
        ...projectRows[0],
        floors_config: this.parseJsonObject(projectRows[0].floors_config),
        building_config: this.parseJsonObject(projectRows[0].building_config),
        amenities: this.parseJsonField(projectRows[0].amenities),
        unit_types: this.parseJsonField(projectRows[0].unit_types),
        financial_options: this.parseJsonField(projectRows[0].financial_options),
      }

      const floorConfig = floorConfigRows.map((floor) => ({
        ...floor,
        apartment_config: this.parseJsonObject(floor.apartment_config),
      }))

      return {
        project,
        floorConfig,
        files: filesRows,
      }
    } catch (error) {
      console.error("Error getting project configuration:", error)
      throw new Error("Error getting project configuration: " + error.message)
    }
  },

  // Actualizar configuración del proyecto
  async updateProjectConfiguration(projectId, configData) {
    const pool = getPool()
    const connection = await pool.getConnection()

    try {
      // Validar que projectId sea un número válido
      const id = Number.parseInt(projectId)
      if (!id || isNaN(id)) {
        throw new Error("ID de proyecto inválido")
      }

      await connection.beginTransaction()

      // Actualizar proyecto principal
      if (configData.project) {
        const { project } = configData
        await connection.execute(
          `UPDATE projects SET 
           name = ?, location = ?, amenities = ?, unit_types = ?, 
           financial_options = ?, floors_config = ?, building_config = ?, 
           map_config = ?, parking_config = ?
           WHERE id = ?`,
          [
            project.name,
            project.location,
            JSON.stringify(project.amenities || []),
            JSON.stringify(project.unit_types || []),
            JSON.stringify(project.financial_options || []),
            JSON.stringify(project.floors_config || {}),
            JSON.stringify(project.building_config || {}),
            JSON.stringify(project.map_config || {}),
            JSON.stringify(project.parking_config || {}),
            id,
          ],
        )
      }

      // Actualizar configuración de pisos específica del proyecto
      if (configData.floorConfig && Array.isArray(configData.floorConfig)) {
        // Eliminar configuración existente del proyecto
        await connection.execute("DELETE FROM project_floor_config WHERE project_id = ?", [id])

        // Insertar nueva configuración
        for (const floorConfig of configData.floorConfig) {
          await connection.execute(
            `INSERT INTO project_floor_config 
             (project_id, floor_number, floor_name, view_box, background_image, apartment_config) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              id,
              floorConfig.floor_number,
              floorConfig.floor_name,
              floorConfig.view_box,
              floorConfig.background_image,
              JSON.stringify(floorConfig.apartment_config || {}),
            ],
          )
        }
      }

      await connection.commit()
      return await this.getProjectConfiguration(id)
    } catch (error) {
      await connection.rollback()
      console.error("Error updating project configuration:", error)
      throw new Error("Error updating project configuration: " + error.message)
    } finally {
      connection.release()
    }
  },

  // Guardar archivo del proyecto
  async saveProjectFile(fileData) {
    const pool = getPool()
    try {
      // Validar que project_id sea un número válido
      const projectId = Number.parseInt(fileData.project_id)
      if (!projectId || isNaN(projectId)) {
        throw new Error("ID de proyecto inválido")
      }

      const [result] = await pool.execute(
        `INSERT INTO project_files 
         (project_id, file_type, file_path, original_name, floor_number, apartment_id, level) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          projectId,
          fileData.file_type,
          fileData.file_path,
          fileData.original_name,
          fileData.floor_number,
          fileData.apartment_id,
          fileData.level,
        ],
      )

      // Obtener el archivo guardado
      const [rows] = await pool.execute("SELECT * FROM project_files WHERE id = ?", [result.insertId])
      return rows[0]
    } catch (error) {
      console.error("Error saving project file:", error)
      throw new Error("Error saving project file: " + error.message)
    }
  },

  // Eliminar archivo del proyecto
  async deleteProjectFile(fileId) {
    const pool = getPool()
    try {
      // Validar que fileId sea un número válido
      const id = Number.parseInt(fileId)
      if (!id || isNaN(id)) {
        throw new Error("ID de archivo inválido")
      }

      // Obtener información del archivo antes de eliminarlo
      const [fileRows] = await pool.execute("SELECT file_path FROM project_files WHERE id = ?", [id])

      if (fileRows.length > 0) {
        // Eliminar archivo físico
        try {
          await fs.unlink(fileRows[0].file_path)
        } catch (fsError) {
          console.warn("Error deleting physical file:", fsError)
        }
      }

      // Eliminar registro de la base de datos
      await pool.execute("DELETE FROM project_files WHERE id = ?", [id])
      return true
    } catch (error) {
      console.error("Error deleting project file:", error)
      throw new Error("Error deleting project file: " + error.message)
    }
  },

  // Obtener planos de pisos
  async getFloorPlans(projectId) {
    const pool = getPool()
    try {
      // Validar que projectId sea un número válido
      const id = Number.parseInt(projectId)
      if (!id || isNaN(id)) {
        throw new Error("ID de proyecto inválido")
      }

      const [rows] = await pool.execute(
        `SELECT floor_number, file_path 
         FROM project_files 
         WHERE project_id = ? AND file_type = 'floor_plan'
         ORDER BY floor_number`,
        [id],
      )

      const floorPlans = {}
      rows.forEach((row) => {
        floorPlans[row.floor_number] = row.file_path
      })

      return floorPlans
    } catch (error) {
      console.error("Error getting floor plans:", error)
      throw new Error("Error getting floor plans: " + error.message)
    }
  },

  // Obtener PDFs de apartamentos
  async getApartmentPDFs(projectId) {
    const pool = getPool()
    try {
      // Validar que projectId sea un número válido
      const id = Number.parseInt(projectId)
      if (!id || isNaN(id)) {
        throw new Error("ID de proyecto inválido")
      }

      const [rows] = await pool.execute(
        `SELECT apartment_id, file_path 
         FROM project_files 
         WHERE project_id = ? AND file_type = 'apartment_pdf'`,
        [id],
      )

      const apartmentPDFs = {}
      rows.forEach((row) => {
        apartmentPDFs[row.apartment_id] = row.file_path
      })

      return apartmentPDFs
    } catch (error) {
      console.error("Error getting apartment PDFs:", error)
      throw new Error("Error getting apartment PDFs: " + error.message)
    }
  },

  // Obtener planos de cocheras
  async getGaragePlans(projectId) {
    const pool = getPool()
    try {
      // Validar que projectId sea un número válido
      const id = Number.parseInt(projectId)
      if (!id || isNaN(id)) {
        throw new Error("ID de proyecto inválido")
      }

      const [rows] = await pool.execute(
        `SELECT level, file_path 
         FROM project_files 
         WHERE project_id = ? AND file_type = 'garage_plan'
         ORDER BY level`,
        [id],
      )

      const garagePlans = {}
      rows.forEach((row) => {
        garagePlans[row.level] = row.file_path
      })

      return garagePlans
    } catch (error) {
      console.error("Error getting garage plans:", error)
      throw new Error("Error getting garage plans: " + error.message)
    }
  },

  // Método helper para parsear JSON arrays
  parseJsonField(field) {
    if (!field) return []
    if (typeof field === "string") {
      try {
        return JSON.parse(field)
      } catch (error) {
        console.warn(`Error parsing JSON field: ${field}`, error)
        return []
      }
    }
    return Array.isArray(field) ? field : []
  },

  // Método helper para parsear JSON objects
  parseJsonObject(field) {
    if (!field) return {}
    if (typeof field === "string") {
      try {
        return JSON.parse(field)
      } catch (error) {
        console.warn(`Error parsing JSON object: ${field}`, error)
        return {}
      }
    }
    return typeof field === "object" ? field : {}
  },
}

module.exports = projectService
