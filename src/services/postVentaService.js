const { getPool } = require("../config/database")

class PostVentaService {
  // Función auxiliar para convertir campos a JSON
  _convertToJSON(data, fields) {
    fields.forEach((field) => {
      if (field === "detalles" && !data[field]) {
        // Si detalles no existe o es null, inicializarlo como array vacío
        data[field] = JSON.stringify([])
      } else if (data[field] && typeof data[field] === "object") {
        // Para otros campos, convertir a JSON si es un objeto
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
          // Si hay un error al parsear, inicializar como array vacío para detalles
          if (field === "detalles") {
            data[field] = []
          } else {
            data[field] = null
          }
        }
      } else if (field === "detalles" && data[field] === null) {
        // Asegurarse de que detalles sea siempre un array
        data[field] = []
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

      // Asegurarse de que detalles sea un array antes de convertirlo a JSON
      if (!reclamoData.detalles) {
        reclamoData.detalles = []
      }

      // Crear una copia del objeto para no modificar el original
      const reclamoToSave = { ...reclamoData }

      // Convertir campos a JSON
      this._convertToJSON(reclamoToSave, ["inspeccion", "ordenTrabajo", "actaConformidad", "detalles"])

      console.log("Guardando reclamo:", reclamoToSave)

      const [result] = await connection.query("INSERT INTO reclamos SET ?", [reclamoToSave])

      const reclamoId = result.insertId

      await connection.commit()

      // Devolver el objeto original con el ID asignado
      return { id: reclamoId, ...reclamoData }
    } catch (error) {
      await connection.rollback()
      console.error("Error completo al crear reclamo:", error)
      throw new Error("Error al crear el reclamo: " + error.message)
    } finally {
      connection.release()
    }
  }

  async getAllReclamos() {
    const pool = getPool()
    try {
      const [rows] = await pool.query("SELECT * FROM reclamos ORDER BY fechaIngreso DESC")
      rows.forEach((row) => this._parseJSON(row, ["inspeccion", "ordenTrabajo", "actaConformidad", "detalles"]))
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
        this._parseJSON(rows[0], ["inspeccion", "ordenTrabajo", "actaConformidad", "detalles"])
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

      // Asegurarse de que detalles sea un array
      if (!reclamoData.detalles) {
        reclamoData.detalles = []
      }

      // Crear una copia del objeto para no modificar el original
      const reclamoToSave = { ...reclamoData }

      this._convertToJSON(reclamoToSave, ["inspeccion", "ordenTrabajo", "actaConformidad", "detalles"])

      const [result] = await connection.query("UPDATE reclamos SET ? WHERE id = ?", [reclamoToSave, id])

      if (result.affectedRows === 0) {
        await connection.rollback()
        return null
      }

      // Obtener el reclamo actualizado
      const [updatedRows] = await connection.query("SELECT * FROM reclamos WHERE id = ?", [id])
      const updatedReclamo = updatedRows[0]
      this._parseJSON(updatedReclamo, ["inspeccion", "ordenTrabajo", "actaConformidad", "detalles"])

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
      rows.forEach((row) => this._parseJSON(row, ["inspeccion", "ordenTrabajo", "actaConformidad", "detalles"]))
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
      this._parseJSON(updatedReclamo, ["inspeccion", "ordenTrabajo", "actaConformidad", "detalles"])

      await connection.commit()
      return updatedReclamo
    } catch (error) {
      await connection.rollback()
      throw new Error("Error al actualizar la fecha y hora de visita: " + error.message)
    } finally {
      connection.release()
    }
  }

  // Método para agregar un detalle a un reclamo
  async agregarDetalleReclamo(id, detalle) {
    const pool = getPool()
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()

      // Obtener el reclamo actual
      const [rows] = await connection.query("SELECT * FROM reclamos WHERE id = ?", [id])
      if (rows.length === 0) {
        await connection.rollback()
        return null
      }

      const reclamo = rows[0]
      this._parseJSON(reclamo, ["inspeccion", "ordenTrabajo", "actaConformidad", "detalles"])

      // Agregar el nuevo detalle
      const detalles = reclamo.detalles || []
      detalles.push(detalle)

      // Actualizar el reclamo
      const detallesJSON = JSON.stringify(detalles)
      const [result] = await connection.query("UPDATE reclamos SET detalles = ? WHERE id = ?", [detallesJSON, id])

      if (result.affectedRows === 0) {
        await connection.rollback()
        return null
      }

      // Obtener el reclamo actualizado
      const [updatedRows] = await connection.query("SELECT * FROM reclamos WHERE id = ?", [id])
      const updatedReclamo = updatedRows[0]
      this._parseJSON(updatedReclamo, ["inspeccion", "ordenTrabajo", "actaConformidad", "detalles"])

      await connection.commit()
      return updatedReclamo
    } catch (error) {
      await connection.rollback()
      throw new Error("Error al agregar detalle al reclamo: " + error.message)
    } finally {
      connection.release()
    }
  }

  // Método para eliminar un detalle de un reclamo
  async eliminarDetalleReclamo(id, index) {
    const pool = getPool()
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()

      // Obtener el reclamo actual
      const [rows] = await connection.query("SELECT * FROM reclamos WHERE id = ?", [id])
      if (rows.length === 0) {
        await connection.rollback()
        return null
      }

      const reclamo = rows[0]
      this._parseJSON(reclamo, ["inspeccion", "ordenTrabajo", "actaConformidad", "detalles"])

      // Verificar que el índice sea válido
      const detalles = reclamo.detalles || []
      if (index < 0 || index >= detalles.length) {
        await connection.rollback()
        return null
      }

      // Eliminar el detalle
      detalles.splice(index, 1)

      // Actualizar el reclamo
      const detallesJSON = JSON.stringify(detalles)
      const [result] = await connection.query("UPDATE reclamos SET detalles = ? WHERE id = ?", [detallesJSON, id])

      if (result.affectedRows === 0) {
        await connection.rollback()
        return null
      }

      // Obtener el reclamo actualizado
      const [updatedRows] = await connection.query("SELECT * FROM reclamos WHERE id = ?", [id])
      const updatedReclamo = updatedRows[0]
      this._parseJSON(updatedReclamo, ["inspeccion", "ordenTrabajo", "actaConformidad", "detalles"])

      await connection.commit()
      return updatedReclamo
    } catch (error) {
      await connection.rollback()
      throw new Error("Error al eliminar detalle del reclamo: " + error.message)
    } finally {
      connection.release()
    }
  }
}

module.exports = new PostVentaService()

