const { getPool } = require("../config/database")

class PostVentaService {
  async getAllReclamos() {
    const pool = getPool()
    try {
      const [rows] = await pool.query("SELECT * FROM reclamos ORDER BY fechaIngreso DESC")
      return rows
    } catch (error) {
      console.error("Error getting reclamos:", error)
      throw new Error("Error getting reclamos: " + error.message)
    }
  }

  async getReclamoById(id) {
    const pool = getPool()
    try {
      const [rows] = await pool.query("SELECT * FROM reclamos WHERE id = ?", [id])
      return rows[0]
    } catch (error) {
      console.error("Error getting reclamo:", error)
      throw new Error("Error getting reclamo: " + error.message)
    }
  }

  async createReclamo(reclamoData) {
    const pool = getPool()
    try {
      // Generar un número de ticket aleatorio
      const ticket =
        "T" +
        Math.floor(Math.random() * 10000)
          .toString()
          .padStart(4, "0")

      const [result] = await pool.query(
        `INSERT INTO reclamos 
         (ticket, cliente, telefono, edificio, unidadFuncional, fechaIngreso, fechaVisita, 
          detalle, comentario, estado, tipoOcupante, horaVisita, detalles) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ticket,
          reclamoData.cliente,
          reclamoData.telefono,
          reclamoData.edificio,
          reclamoData.unidadFuncional,
          reclamoData.fechaIngreso,
          reclamoData.fechaVisita,
          reclamoData.detalle,
          reclamoData.comentario || "",
          reclamoData.estado || "Ingresado",
          reclamoData.tipoOcupante || "Inquilino",
          reclamoData.horaVisita,
          JSON.stringify(reclamoData.detalles || []),
        ],
      )

      // Obtener el reclamo recién creado
      const [rows] = await pool.query("SELECT * FROM reclamos WHERE id = ?", [result.insertId])
      return rows[0]
    } catch (error) {
      console.error("Error creating reclamo:", error)
      throw new Error("Error creating reclamo: " + error.message)
    }
  }

  async updateReclamo(id, reclamoData) {
    const pool = getPool()
    try {
      // Actualizar los campos del reclamo
      await pool.query(
        `UPDATE reclamos SET 
         cliente = ?, 
         telefono = ?, 
         edificio = ?, 
         unidadFuncional = ?, 
         fechaIngreso = ?, 
         fechaVisita = ?, 
         detalle = ?, 
         comentario = ?, 
         estado = ?, 
         inspeccion = ?, 
         ordenTrabajo = ?, 
         actaConformidad = ?, 
         tipoOcupante = ?, 
         horaVisita = ?, 
         detalles = ? 
         WHERE id = ?`,
        [
          reclamoData.cliente,
          reclamoData.telefono,
          reclamoData.edificio,
          reclamoData.unidadFuncional,
          reclamoData.fechaIngreso,
          reclamoData.fechaVisita,
          reclamoData.detalle,
          reclamoData.comentario,
          reclamoData.estado,
          reclamoData.inspeccion,
          reclamoData.ordenTrabajo,
          reclamoData.actaConformidad,
          reclamoData.tipoOcupante,
          reclamoData.horaVisita,
          JSON.stringify(reclamoData.detalles || []),
          id,
        ],
      )

      // Obtener el reclamo actualizado
      const [rows] = await pool.query("SELECT * FROM reclamos WHERE id = ?", [id])
      return rows[0]
    } catch (error) {
      console.error("Error updating reclamo:", error)
      throw new Error("Error updating reclamo: " + error.message)
    }
  }

  async deleteReclamo(id) {
    const pool = getPool()
    try {
      await pool.query("DELETE FROM reclamos WHERE id = ?", [id])
    } catch (error) {
      console.error("Error deleting reclamo:", error)
      throw new Error("Error deleting reclamo: " + error.message)
    }
  }
}

module.exports = new PostVentaService()

