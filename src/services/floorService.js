const { getPool } = require("../config/database")

const floorService = {
  // Obtener pisos por proyecto
  async getFloorsByProject(projectId) {
    const pool = getPool()
    try {
      // Validar que projectId sea un número válido
      const id = Number.parseInt(projectId)
      if (!id || isNaN(id)) {
        throw new Error("ID de proyecto inválido")
      }

      const query = `
        SELECT 
          f.*,
          COUNT(a.id) as total_apartments,
          COUNT(CASE WHEN a.status = 'libre' THEN 1 END) as available_apartments,
          COUNT(CASE WHEN a.status = 'reservado' THEN 1 END) as reserved_apartments,
          COUNT(CASE WHEN a.status = 'ocupado' THEN 1 END) as sold_apartments
        FROM floors f
        LEFT JOIN apartments a ON f.id = a.floor_id
        WHERE f.project_id = ?
        GROUP BY f.id
        ORDER BY f.floor_number ASC
      `

      const [rows] = await pool.execute(query, [id])
      return rows
    } catch (error) {
      console.error("Error getting floors by project:", error)
      throw new Error("Error getting floors by project: " + error.message)
    }
  },

  // Obtener piso específico
  async getFloorById(floorId) {
    const pool = getPool()
    try {
      // Validar que floorId sea un número válido
      const id = Number.parseInt(floorId)
      if (!id || isNaN(id)) {
        throw new Error("ID de piso inválido")
      }

      const query = `
        SELECT 
          f.*,
          p.name as project_name,
          COUNT(a.id) as total_apartments,
          COUNT(CASE WHEN a.status = 'libre' THEN 1 END) as available_apartments,
          COUNT(CASE WHEN a.status = 'reservado' THEN 1 END) as reserved_apartments,
          COUNT(CASE WHEN a.status = 'ocupado' THEN 1 END) as sold_apartments
        FROM floors f
        LEFT JOIN projects p ON f.project_id = p.id
        LEFT JOIN apartments a ON f.id = a.floor_id
        WHERE f.id = ?
        GROUP BY f.id
      `

      const [rows] = await pool.execute(query, [id])
      return rows[0] || null
    } catch (error) {
      console.error("Error getting floor by id:", error)
      throw new Error("Error getting floor by id: " + error.message)
    }
  },

  // Crear nuevo piso
  async createFloor(floorData) {
    const pool = getPool()
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      // Validar que project_id sea un número válido
      const projectId = Number.parseInt(floorData.project_id)
      if (!projectId || isNaN(projectId)) {
        throw new Error("ID de proyecto inválido")
      }

      const query = `
        INSERT INTO floors (
          project_id, floor_number, floor_name, total_apartments,
          floor_plan_path, svg_config, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
      `

      const [result] = await connection.execute(query, [
        projectId,
        floorData.floor_number,
        floorData.floor_name || `Piso ${floorData.floor_number}`,
        floorData.total_apartments || 0,
        floorData.floor_plan_path || null,
        JSON.stringify(floorData.svg_config || {}),
      ])

      await connection.commit()

      // Obtener el piso completo creado
      const [rows] = await connection.execute("SELECT * FROM floors WHERE id = ?", [result.insertId])
      return rows[0]
    } catch (error) {
      await connection.rollback()
      console.error("Error creating floor:", error)
      throw new Error("Error creating floor: " + error.message)
    } finally {
      connection.release()
    }
  },

  // Actualizar piso
  async updateFloor(floorId, floorData) {
    const pool = getPool()
    try {
      // Validar que floorId sea un número válido
      const id = Number.parseInt(floorId)
      if (!id || isNaN(id)) {
        throw new Error("ID de piso inválido")
      }

      const query = `
        UPDATE floors 
        SET floor_name = ?, total_apartments = ?, floor_plan_path = ?, 
            svg_config = ?, updated_at = NOW()
        WHERE id = ?
      `

      await pool.execute(query, [
        floorData.floor_name,
        floorData.total_apartments,
        floorData.floor_plan_path,
        JSON.stringify(floorData.svg_config || {}),
        id,
      ])

      return this.getFloorById(id)
    } catch (error) {
      console.error("Error updating floor:", error)
      throw new Error("Error updating floor: " + error.message)
    }
  },

  // Eliminar piso
  async deleteFloor(floorId) {
    const pool = getPool()
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      // Validar que floorId sea un número válido
      const id = Number.parseInt(floorId)
      if (!id || isNaN(id)) {
        throw new Error("ID de piso inválido")
      }

      // Primero eliminar todos los apartamentos del piso
      await connection.execute("DELETE FROM apartments WHERE floor_id = ?", [id])

      // Luego eliminar el piso
      await connection.execute("DELETE FROM floors WHERE id = ?", [id])

      await connection.commit()
      return true
    } catch (error) {
      await connection.rollback()
      console.error("Error deleting floor:", error)
      throw new Error("Error deleting floor: " + error.message)
    } finally {
      connection.release()
    }
  },

  // Obtener estadísticas de un piso específico
  async getFloorStats(projectId, floorNumber) {
    const pool = getPool()
    try {
      // Validar que projectId y floorNumber sean números válidos
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
          f.floor_number,
          f.floor_name,
          COUNT(a.id) as total_apartments,
          COUNT(CASE WHEN a.status = 'libre' THEN 1 END) as availableUnits,
          COUNT(CASE WHEN a.status = 'reservado' THEN 1 END) as reservedUnits,
          COUNT(CASE WHEN a.status = 'ocupado' THEN 1 END) as soldUnits
        FROM floors f
        LEFT JOIN apartments a ON f.id = a.floor_id
        WHERE f.project_id = ? AND f.floor_number = ?
        GROUP BY f.id
      `

      const [rows] = await pool.execute(query, [id, floor])
      return (
        rows[0] || {
          floor_number: floor,
          total_apartments: 0,
          availableUnits: 0,
          reservedUnits: 0,
          soldUnits: 0,
        }
      )
    } catch (error) {
      console.error("Error getting floor stats:", error)
      throw new Error("Error getting floor stats: " + error.message)
    }
  },

  // Obtener configuración de pisos para un proyecto
  async getFloorConfiguration(projectId) {
    const pool = getPool()
    try {
      // Validar que projectId sea un número válido
      const id = Number.parseInt(projectId)
      if (!id || isNaN(id)) {
        throw new Error("ID de proyecto inválido")
      }

      const query = `
        SELECT * FROM project_floor_config 
        WHERE project_id = ?
        ORDER BY floor_number ASC
      `

      const [rows] = await pool.execute(query, [id])

      // Parsear configuraciones JSON
      return rows.map((row) => ({
        ...row,
        apartment_config: this.parseJsonField(row.apartment_config),
      }))
    } catch (error) {
      console.error("Error getting floor configuration:", error)
      throw new Error("Error getting floor configuration: " + error.message)
    }
  },

  // Método helper para parsear JSON
  parseJsonField(field) {
    if (!field) return {}
    if (typeof field === "string") {
      try {
        return JSON.parse(field)
      } catch (error) {
        console.warn(`Error parsing JSON field: ${field}`, error)
        return {}
      }
    }
    return typeof field === "object" ? field : {}
  },
}

module.exports = floorService
