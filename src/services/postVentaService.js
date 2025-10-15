const { getPool } = require("../config/database")

function safeJSONParse(value) {
  if (!value) return []

  // If it's already an array, return it
  if (Array.isArray(value)) return value

  // Try to parse as JSON
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    // If JSON parsing fails, treat it as a comma-separated string
    if (typeof value === "string") {
      // Split by comma and trim whitespace, filter out empty strings
      return value
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    }
    return []
  }
}

class PostVentaService {
  async getAllReclamos() {
    const pool = getPool()
    try {
      const [rows] = await pool.query("SELECT * FROM reclamos ORDER BY fechaCreacion DESC, fechaIngreso DESC")
      return rows.map((row) => ({
        ...row,
        detalles: safeJSONParse(row.detalles),
        fotos: safeJSONParse(row.fotos),
      }))
    } catch (error) {
      console.error("Error getting reclamos:", error)
      throw new Error("Error getting reclamos: " + error.message)
    }
  }

  async getReclamoById(id) {
    const pool = getPool()
    try {
      const [rows] = await pool.query("SELECT * FROM reclamos WHERE id = ?", [id])
      if (rows.length === 0) return null
      const reclamo = rows[0]
      return {
        ...reclamo,
        detalles: safeJSONParse(reclamo.detalles),
        fotos: safeJSONParse(reclamo.fotos),
      }
    } catch (error) {
      console.error("Error getting reclamo:", error)
      throw new Error("Error getting reclamo: " + error.message)
    }
  }

  async createReclamo(reclamoData) {
    const pool = getPool()
    try {
      const [lastTicket] = await pool.query(
        "SELECT ticket FROM reclamos WHERE ticket LIKE 'T%' ORDER BY CAST(SUBSTRING(ticket, 2) AS UNSIGNED) DESC LIMIT 1",
      )

      let ticketNumber = 1
      if (lastTicket.length > 0 && lastTicket[0].ticket) {
        const lastNumber = Number.parseInt(lastTicket[0].ticket.substring(1))
        ticketNumber = lastNumber + 1
      }

      const ticket = "T" + ticketNumber.toString().padStart(4, "0")

      const fechaCreacion = new Date().toISOString().split("T")[0]

      const [result] = await pool.query(
        `INSERT INTO reclamos 
         (ticket, fechaCreacion, cliente, telefono, edificio, unidadFuncional, fechaIngreso, fechaVisita, 
          detalle, comentario, estado, tipoOcupante, nombreInquilino, horaVisita, detalles, fechaPosesion, 
          ubicacionAfectada, rubro, proveedor, urgencia, fotos, notas) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ticket,
          fechaCreacion,
          reclamoData.cliente,
          reclamoData.telefono,
          reclamoData.edificio,
          reclamoData.unidadFuncional,
          reclamoData.fechaIngreso || fechaCreacion,
          reclamoData.fechaVisita,
          reclamoData.detalle,
          reclamoData.comentario || "",
          reclamoData.estado || "Ingresado",
          reclamoData.tipoOcupante || "Propietario",
          reclamoData.nombreInquilino || null,
          reclamoData.horaVisita,
          JSON.stringify(reclamoData.detalles || []),
          reclamoData.fechaPosesion,
          reclamoData.ubicacionAfectada,
          reclamoData.rubro,
          reclamoData.proveedor,
          reclamoData.urgencia || "Media",
          JSON.stringify(reclamoData.fotos || []),
          reclamoData.notas || "",
        ],
      )

      return await this.getReclamoById(result.insertId)
    } catch (error) {
      console.error("Error creating reclamo:", error)
      throw new Error("Error creating reclamo: " + error.message)
    }
  }

  async updateReclamo(id, reclamoData) {
    const pool = getPool()
    try {
      const inspeccionValue = reclamoData.inspeccion ? 1 : 0

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
         nombreInquilino = ?,
         horaVisita = ?, 
         detalles = ?,
         fechaPosesion = ?,
         ubicacionAfectada = ?,
         rubro = ?,
         proveedor = ?,
         urgencia = ?,
         fotos = ?,
         notas = ?,
         fechaCierre = ?,
         tiempoResolucion = ?,
         proveedorResolvio = ?,
         costo = ?
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
          inspeccionValue,
          reclamoData.ordenTrabajo ? 1 : 0,
          reclamoData.actaConformidad ? 1 : 0,
          reclamoData.tipoOcupante,
          reclamoData.nombreInquilino || null,
          reclamoData.horaVisita,
          JSON.stringify(reclamoData.detalles || []),
          reclamoData.fechaPosesion,
          reclamoData.ubicacionAfectada,
          reclamoData.rubro,
          reclamoData.proveedor,
          reclamoData.urgencia,
          JSON.stringify(reclamoData.fotos || []),
          reclamoData.notas,
          reclamoData.fechaCierre,
          reclamoData.tiempoResolucion,
          reclamoData.proveedorResolvio,
          reclamoData.costo,
          id,
        ],
      )

      return await this.getReclamoById(id)
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

  async cerrarTicket(id, cierreData) {
    const pool = getPool()
    try {
      const [rows] = await pool.query("SELECT fechaCreacion FROM reclamos WHERE id = ?", [id])
      if (rows.length === 0) {
        throw new Error("Reclamo no encontrado")
      }

      const fechaCreacion = new Date(rows[0].fechaCreacion)
      const fechaCierre = new Date(cierreData.fechaCierre || new Date())
      const tiempoResolucion = Math.ceil((fechaCierre - fechaCreacion) / (1000 * 60 * 60 * 24))

      await pool.query(
        `UPDATE reclamos SET 
         estado = 'Solucionado',
         fechaCierre = ?,
         tiempoResolucion = ?,
         proveedorResolvio = ?,
         costo = ?
         WHERE id = ?`,
        [fechaCierre.toISOString().split("T")[0], tiempoResolucion, cierreData.proveedorResolvio, cierreData.costo, id],
      )

      return await this.getReclamoById(id)
    } catch (error) {
      console.error("Error cerrando ticket:", error)
      throw new Error("Error cerrando ticket: " + error.message)
    }
  }

  async getEstadisticas() {
    const pool = getPool()
    try {
      // Estadísticas por estado
      const [porEstado] = await pool.query(`
        SELECT estado, COUNT(*) as cantidad 
        FROM reclamos 
        GROUP BY estado
      `)

      // Estadísticas por rubro
      const [porRubro] = await pool.query(`
        SELECT rubro, COUNT(*) as cantidad 
        FROM reclamos 
        WHERE rubro IS NOT NULL AND rubro != ''
        GROUP BY rubro
        ORDER BY cantidad DESC
      `)

      // Estadísticas por proveedor
      const [porProveedor] = await pool.query(`
        SELECT proveedor, COUNT(*) as cantidad 
        FROM reclamos 
        WHERE proveedor IS NOT NULL AND proveedor != ''
        GROUP BY proveedor
        ORDER BY cantidad DESC
      `)

      // Costo por ticket
      const [costoPorTicket] = await pool.query(`
        SELECT ticket, costo 
        FROM reclamos 
        WHERE costo IS NOT NULL AND costo > 0
        ORDER BY costo DESC
      `)

      // Costo total
      const [costoTotal] = await pool.query(`
        SELECT SUM(costo) as total 
        FROM reclamos 
        WHERE costo IS NOT NULL
      `)

      // Tiempo promedio de resolución
      const [tiempoPromedio] = await pool.query(`
        SELECT AVG(tiempoResolucion) as promedio 
        FROM reclamos 
        WHERE tiempoResolucion IS NOT NULL
      `)

      return {
        porEstado,
        porRubro,
        porProveedor,
        costoPorTicket,
        costoTotal: costoTotal[0]?.total || 0,
        tiempoPromedioResolucion: Math.round(tiempoPromedio[0]?.promedio || 0),
      }
    } catch (error) {
      console.error("Error obteniendo estadísticas:", error)
      throw new Error("Error obteniendo estadísticas: " + error.message)
    }
  }

  async searchReclamos(term) {
    const pool = getPool()
    try {
      const searchTerm = `%${term}%`
      const [rows] = await pool.query(
        `SELECT * FROM reclamos 
         WHERE ticket LIKE ? 
         OR cliente LIKE ? 
         OR edificio LIKE ? 
         OR unidadFuncional LIKE ?
         ORDER BY fechaCreacion DESC`,
        [searchTerm, searchTerm, searchTerm, searchTerm],
      )
      return rows.map((row) => ({
        ...row,
        detalles: safeJSONParse(row.detalles),
        fotos: safeJSONParse(row.fotos),
      }))
    } catch (error) {
      console.error("Error searching reclamos:", error)
      throw new Error("Error searching reclamos: " + error.message)
    }
  }

  async actualizarFechaHoraVisita(id, fechaVisita, horaVisita) {
    const pool = getPool()
    try {
      await pool.query(`UPDATE reclamos SET fechaVisita = ?, horaVisita = ? WHERE id = ?`, [
        fechaVisita,
        horaVisita,
        id,
      ])
      return await this.getReclamoById(id)
    } catch (error) {
      console.error("Error actualizando fecha/hora visita:", error)
      throw new Error("Error actualizando fecha/hora visita: " + error.message)
    }
  }

  async agregarDetalleReclamo(id, detalle) {
    const pool = getPool()
    try {
      const reclamo = await this.getReclamoById(id)
      if (!reclamo) throw new Error("Reclamo no encontrado")

      const detalles = reclamo.detalles || []
      detalles.push(detalle)

      await pool.query(`UPDATE reclamos SET detalles = ? WHERE id = ?`, [JSON.stringify(detalles), id])
      return await this.getReclamoById(id)
    } catch (error) {
      console.error("Error agregando detalle:", error)
      throw new Error("Error agregando detalle: " + error.message)
    }
  }

  async eliminarDetalleReclamo(id, index) {
    const pool = getPool()
    try {
      const reclamo = await this.getReclamoById(id)
      if (!reclamo) throw new Error("Reclamo no encontrado")

      const detalles = reclamo.detalles || []
      if (index < 0 || index >= detalles.length) {
        throw new Error("Índice inválido")
      }

      detalles.splice(index, 1)

      await pool.query(`UPDATE reclamos SET detalles = ? WHERE id = ?`, [JSON.stringify(detalles), id])
      return await this.getReclamoById(id)
    } catch (error) {
      console.error("Error eliminando detalle:", error)
      throw new Error("Error eliminando detalle: " + error.message)
    }
  }

  async updateEstadoReclamo(id, estado) {
    const pool = getPool()
    try {
      await pool.query(`UPDATE reclamos SET estado = ? WHERE id = ?`, [estado, id])
      return await this.getReclamoById(id)
    } catch (error) {
      console.error("Error actualizando estado:", error)
      throw new Error("Error actualizando estado: " + error.message)
    }
  }
}

module.exports = new PostVentaService()
