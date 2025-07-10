const { getPool } = require("../config/database")

const apartmentService = {
  // Obtener apartamentos por proyecto
  async getApartmentsByProject(projectId) {
    const pool = getPool()
    try {
      // Validar que projectId sea un número válido
      const id = Number.parseInt(projectId)
      if (!id || isNaN(id)) {
        throw new Error("ID de proyecto inválido")
      }

      const query = `
    SELECT 
      a.*,
      f.floor_number,
      f.floor_name,
      p.name as project_name
    FROM apartments a
    JOIN floors f ON a.floor_id = f.id
    JOIN projects p ON f.project_id = p.id
    WHERE f.project_id = ?
    ORDER BY f.floor_number ASC, a.apartment_number ASC
  `

      const [rows] = await pool.execute(query, [id])
      return rows
    } catch (error) {
      console.error("Error getting apartments by project:", error)
      throw new Error("Error getting apartments by project: " + error.message)
    }
  },

  // Obtener apartamentos por piso
  async getApartmentsByFloor(floorId) {
    const pool = getPool()
    try {
      // Validar que floorId sea un número válido
      const id = Number.parseInt(floorId)
      if (!id || isNaN(id)) {
        throw new Error("ID de piso inválido")
      }

      const query = `
    SELECT 
      a.*,
      f.floor_number,
      f.floor_name,
      p.name as project_name
    FROM apartments a
    JOIN floors f ON a.floor_id = f.id
    JOIN projects p ON f.project_id = p.id
    WHERE a.floor_id = ?
    ORDER BY a.apartment_number ASC
  `

      const [rows] = await pool.execute(query, [id])
      return rows
    } catch (error) {
      console.error("Error getting apartments by floor:", error)
      throw new Error("Error getting apartments by floor: " + error.message)
    }
  },

  // Obtener apartamento específico
  async getApartmentById(apartmentId) {
    const pool = getPool()
    try {
      // Validar que apartmentId sea un número válido
      const id = Number.parseInt(apartmentId)
      if (!id || isNaN(id)) {
        throw new Error("ID de apartamento inválido")
      }

      const query = `
    SELECT 
      a.*,
      f.floor_number,
      f.floor_name,
      p.name as project_name,
      p.id as project_id
    FROM apartments a
    JOIN floors f ON a.floor_id = f.id
    JOIN projects p ON f.project_id = p.id
    WHERE a.id = ?
  `

      const [rows] = await pool.execute(query, [id])
      return rows[0] || null
    } catch (error) {
      console.error("Error getting apartment by id:", error)
      throw new Error("Error getting apartment by id: " + error.message)
    }
  },

  // Crear nuevo apartamento
  async createApartment(apartmentData) {
    const pool = getPool()
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      // Validar que floor_id sea un número válido
      const floorId = Number.parseInt(apartmentData.floor_id)
      if (!floorId || isNaN(floorId)) {
        throw new Error("ID de piso inválido")
      }

      const query = `
    INSERT INTO apartments (
      floor_id, apartment_number, apartment_type, size_m2,
      bedrooms, bathrooms, price, status, description,
      svg_path, coordinates, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
  `

      const [result] = await connection.execute(query, [
        floorId,
        apartmentData.apartment_number,
        apartmentData.apartment_type || "departamento",
        apartmentData.size_m2 || 0,
        apartmentData.bedrooms || 0,
        apartmentData.bathrooms || 0,
        apartmentData.price || 0,
        apartmentData.status || "libre",
        apartmentData.description || "",
        apartmentData.svg_path || "",
        JSON.stringify(apartmentData.coordinates || {}),
      ])

      await connection.commit()

      // Obtener el apartamento completo creado
      const [rows] = await connection.execute(
        `SELECT 
      a.*,
      f.floor_number,
      f.floor_name,
      p.name as project_name,
      p.id as project_id
    FROM apartments a
    JOIN floors f ON a.floor_id = f.id
    JOIN projects p ON f.project_id = p.id
    WHERE a.id = ?`,
        [result.insertId],
      )
      return rows[0]
    } catch (error) {
      await connection.rollback()
      console.error("Error creating apartment:", error)
      throw new Error("Error creating apartment: " + error.message)
    } finally {
      connection.release()
    }
  },

  // Actualizar apartamento
  async updateApartment(apartmentId, apartmentData) {
    const pool = getPool()
    try {
      // Validar que apartmentId sea un número válido
      const id = Number.parseInt(apartmentId)
      if (!id || isNaN(id)) {
        throw new Error("ID de apartamento inválido")
      }

      const query = `
    UPDATE apartments 
    SET apartment_number = ?, apartment_type = ?, size_m2 = ?,
        bedrooms = ?, bathrooms = ?, price = ?, status = ?,
        description = ?, svg_path = ?, coordinates = ?, updated_at = NOW()
    WHERE id = ?
  `

      await pool.execute(query, [
        apartmentData.apartment_number,
        apartmentData.apartment_type,
        apartmentData.size_m2,
        apartmentData.bedrooms,
        apartmentData.bathrooms,
        apartmentData.price,
        apartmentData.status,
        apartmentData.description,
        apartmentData.svg_path,
        JSON.stringify(apartmentData.coordinates || {}),
        id,
      ])

      return this.getApartmentById(id)
    } catch (error) {
      console.error("Error updating apartment:", error)
      throw new Error("Error updating apartment: " + error.message)
    }
  },

  // Eliminar apartamento
  async deleteApartment(apartmentId) {
    const pool = getPool()
    try {
      // Validar que apartmentId sea un número válido
      const id = Number.parseInt(apartmentId)
      if (!id || isNaN(id)) {
        throw new Error("ID de apartamento inválido")
      }

      await pool.execute("DELETE FROM apartments WHERE id = ?", [id])
      return true
    } catch (error) {
      console.error("Error deleting apartment:", error)
      throw new Error("Error deleting apartment: " + error.message)
    }
  },

  // Cambiar estado de apartamento
  async changeApartmentStatus(apartmentId, newStatus) {
    const pool = getPool()
    try {
      // Validar que apartmentId sea un número válido
      const id = Number.parseInt(apartmentId)
      if (!id || isNaN(id)) {
        throw new Error("ID de apartamento inválido")
      }

      // Validar que el estado sea válido
      const validStatuses = ["libre", "reservado", "ocupado"]
      if (!validStatuses.includes(newStatus)) {
        throw new Error("Estado de apartamento inválido")
      }

      const query = `
    UPDATE apartments 
    SET status = ?, updated_at = NOW()
    WHERE id = ?
  `

      await pool.execute(query, [newStatus, id])
      return this.getApartmentById(id)
    } catch (error) {
      console.error("Error changing apartment status:", error)
      throw new Error("Error changing apartment status: " + error.message)
    }
  },

  // Obtener estadísticas de apartamentos por proyecto
  async getApartmentStats(projectId) {
    const pool = getPool()
    try {
      // Validar que projectId sea un número válido
      const id = Number.parseInt(projectId)
      if (!id || isNaN(id)) {
        throw new Error("ID de proyecto inválido")
      }

      const query = `
    SELECT 
      COUNT(a.id) as total_apartments,
      COUNT(CASE WHEN a.status = 'libre' THEN 1 END) as available_apartments,
      COUNT(CASE WHEN a.status = 'reservado' THEN 1 END) as reserved_apartments,
      COUNT(CASE WHEN a.status = 'ocupado' THEN 1 END) as sold_apartments,
      AVG(a.price) as average_price,
      SUM(a.size_m2) as total_area
    FROM apartments a
    JOIN floors f ON a.floor_id = f.id
    WHERE f.project_id = ?
  `

      const [rows] = await pool.execute(query, [id])
      return (
        rows[0] || {
          total_apartments: 0,
          available_apartments: 0,
          reserved_apartments: 0,
          sold_apartments: 0,
          average_price: 0,
          total_area: 0,
        }
      )
    } catch (error) {
      console.error("Error getting apartment stats:", error)
      throw new Error("Error getting apartment stats: " + error.message)
    }
  },
}

module.exports = apartmentService
