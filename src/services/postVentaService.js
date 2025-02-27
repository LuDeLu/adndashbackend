const { getPool } = require("../config/database")

class PostVentaService {
  // Función auxiliar para convertir campos a JSON
  _convertToJSON(data, fields) {
    fields.forEach((field) => {
      if (data[field] && typeof data[field] === "object") {
        data[field] = JSON.stringify(data[field])
      }
    })
  }

  // Función auxiliar para parsear campos JSON
  _parseJSON(data, fields) {
    fields.forEach((field) => {
      if (data[field] && typeof data[field] === "string") {
        try {
          data[field] = JSON.parse(data[field])
        } catch (error) {
          console.error(`Error parsing JSON for field ${field}:`, error)
          data[field] = null
        }
      }
    })
  }

  async createReclamo(reclamoData) {
    const pool = getPool()
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()

      // Asegurarse de que fechaVisita sea una fecha válida
      if (reclamoData.fechaVisita && reclamoData.fechaVisita.trim() === "") {
        reclamoData.fechaVisita = null
      }

      this._convertToJSON(reclamoData, ["inspeccion", "ordenTrabajo", "actaConformidad"])

      const [result] = await connection.query("INSERT INTO reclamos SET ?", [reclamoData])

      const reclamoId = result.insertId

      await connection.commit()
      return { id: reclamoId, ...reclamoData }
    } catch (error) {
      await connection.rollback()
      throw new Error("Error al crear el reclamo: " + error.message)
    } finally {
      connection.release()
    }
  }

  async getAllReclamos() {
    const pool = getPool()
    try {
      const [rows] = await pool.query("SELECT * FROM reclamos ORDER BY fechaIngreso DESC")
      rows.forEach((row) => this._parseJSON(row, ["inspeccion", "ordenTrabajo", "actaConformidad"]))
      return rows
    } catch (error) {
      throw new Error("Error al obtener los reclamos: " + error.message)
    }
  }

  async getReclamoById(id) {
    const pool = getPool()
    try {
      const [rows] = await pool.query("SELECT * FROM reclamos WHERE id = ?", [id])
      if (rows[0]) {
        this._parseJSON(rows[0], ["inspeccion", "ordenTrabajo", "actaConformidad"])
      }
      return rows[0]
    } catch (error) {
      throw new Error("Error al obtener el reclamo: " + error.message)
    }
  }

  async updateReclamo(id, reclamoData) {
    const pool = getPool()
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()

      // Asegurarse de que fechaVisita y horaVisita sean válidas
      if (reclamoData.fechaVisita && reclamoData.fechaVisita.trim() === "") {
        reclamoData.fechaVisita = null
      }
      if (reclamoData.horaVisita && reclamoData.horaVisita.trim() === "") {
        reclamoData.horaVisita = null
      }

      this._convertToJSON(reclamoData, ["inspeccion", "ordenTrabajo", "actaConformidad"])

      const [result] = await connection.query("UPDATE reclamos SET ? WHERE id = ?", [reclamoData, id])

      if (result.affectedRows === 0) {
        await connection.rollback()
        return null
      }

      // Obtener el reclamo actualizado
      const [updatedRows] = await connection.query("SELECT * FROM reclamos WHERE id = ?", [id])
      const updatedReclamo = updatedRows[0]
      this._parseJSON(updatedReclamo, ["inspeccion", "ordenTrabajo", "actaConformidad"])

      await connection.commit()
      return updatedReclamo
    } catch (error) {
      await connection.rollback()
      throw new Error("Error al actualizar el reclamo: " + error.message)
    } finally {
      connection.release()
    }
  }

  async deleteReclamo(id) {
    const pool = getPool()
    try {
      const [result] = await pool.query("DELETE FROM reclamos WHERE id = ?", [id])
      return result.affectedRows > 0
    } catch (error) {
      throw new Error("Error al eliminar el reclamo: " + error.message)
    }
  }

  // Método para buscar reclamos por diferentes criterios
  async searchReclamos(searchTerm) {
    const pool = getPool()
    try {
      const term = `%${searchTerm}%`
      const [rows] = await pool.query(
        `SELECT * FROM reclamos 
         WHERE cliente LIKE ? 
         OR ticket LIKE ? 
         OR edificio LIKE ? 
         OR unidadFuncional LIKE ? 
         OR estado LIKE ?
         ORDER BY fechaIngreso DESC`,
        [term, term, term, term, term],
      )
      rows.forEach((row) => this._parseJSON(row, ["inspeccion", "ordenTrabajo", "actaConformidad"]))
      return rows
    } catch (error) {
      throw new Error("Error al buscar reclamos: " + error.message)
    }
  }

  // Método para obtener estadísticas de reclamos
  async getReclamosStats() {
    const pool = getPool()
    try {
      const [totalRows] = await pool.query("SELECT COUNT(*) as total FROM reclamos")
      const [byStatusRows] = await pool.query(
        `SELECT estado, COUNT(*) as count 
         FROM reclamos 
         GROUP BY estado`,
      )
      const [byBuildingRows] = await pool.query(
        `SELECT edificio, COUNT(*) as count 
         FROM reclamos 
         GROUP BY edificio 
         ORDER BY count DESC 
         LIMIT 5`,
      )

      return {
        total: totalRows[0].total,
        byStatus: byStatusRows,
        byBuilding: byBuildingRows,
      }
    } catch (error) {
      throw new Error("Error al obtener estadísticas de reclamos: " + error.message)
    }
  }

  async actualizarFechaHoraVisita(id, fechaVisita, horaVisita) {
    const pool = getPool()
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()

      const [result] = await connection.query("UPDATE reclamos SET fechaVisita = ?, horaVisita = ? WHERE id = ?", [
        fechaVisita,
        horaVisita,
        id,
      ])

      if (result.affectedRows === 0) {
        await connection.rollback()
        return null
      }

      const [updatedRows] = await connection.query("SELECT * FROM reclamos WHERE id = ?", [id])
      const updatedReclamo = updatedRows[0]
      this._parseJSON(updatedReclamo, ["inspeccion", "ordenTrabajo", "actaConformidad"])

      await connection.commit()
      return updatedReclamo
    } catch (error) {
      await connection.rollback()
      throw new Error("Error al actualizar la fecha y hora de visita: " + error.message)
    } finally {
      connection.release()
    }
  }
}

module.exports = new PostVentaService()

