const { getPool } = require("../config/database")

class ChecklistService {
 async getAllTickets() {
   const pool = getPool()
   try {
     const [rows] = await pool.query(`
       SELECT * FROM approval_tickets
       ORDER BY fecha_creacion DESC
     `)

     // Para cada ticket, obtener sus aprobaciones
     for (const ticket of rows) {
       const [aprobaciones] = await pool.query(
         `
         SELECT * FROM approval_signatures
         WHERE ticket_id = ?
       `,
         [ticket.id],
       )

       // Convertir las aprobaciones a un objeto estructurado
       ticket.aprobaciones = {
         contaduria: this.findDepartmentApproval(aprobaciones, "contaduria"),
         legales: this.findDepartmentApproval(aprobaciones, "legales"),
         tesoreria: this.findDepartmentApproval(aprobaciones, "tesoreria"),
         gerenciaComercial: this.findDepartmentApproval(aprobaciones, "gerenciaComercial"),
         gerencia: this.findDepartmentApproval(aprobaciones, "gerencia"),
         arquitecto: this.findDepartmentApproval(aprobaciones, "arquitecto"),
       }

       // Convertir form_data de JSON a objeto
       if (ticket.form_data) {
         try {
           // Si ya es un objeto, no necesitamos parsearlo
           if (typeof ticket.form_data === 'object' && ticket.form_data !== null) {
             ticket.formData = ticket.form_data;
           } else {
             // Si es una cadena, intentamos parsearlo
             ticket.formData = JSON.parse(ticket.form_data);
           }
         } catch (error) {
           console.error("Error al parsear form_data:", error);
           ticket.formData = {}; // Valor predeterminado en caso de error
         }
       }
     }

     return rows
   } catch (error) {
     console.error("Error en getAllTickets:", error)
     throw new Error("Error al obtener los tickets: " + error.message)
   }
 }

 findDepartmentApproval(aprobaciones, departamento) {
   const aprobacion = aprobaciones.find((a) => a.departamento === departamento)
   if (aprobacion) {
     return {
       aprobado: aprobacion.aprobado === 1,
       usuario: aprobacion.usuario,
       fecha: aprobacion.fecha,
       comentarios: aprobacion.comentarios,
     }
   }
   return { aprobado: false, usuario: "", fecha: null, comentarios: "" }
 }

 async getTicketById(id) {
   const pool = getPool()
   try {
     const [rows] = await pool.query(
       `
       SELECT * FROM approval_tickets
       WHERE id = ?
     `,
       [id],
     )

     if (rows.length === 0) {
       return null
     }

     const ticket = rows[0]

     // Obtener las aprobaciones
     const [aprobaciones] = await pool.query(
       `
       SELECT * FROM approval_signatures
       WHERE ticket_id = ?
     `,
       [id],
     )

     // Convertir las aprobaciones a un objeto estructurado
     ticket.aprobaciones = {
       contaduria: this.findDepartmentApproval(aprobaciones, "contaduria"),
       legales: this.findDepartmentApproval(aprobaciones, "legales"),
       tesoreria: this.findDepartmentApproval(aprobaciones, "tesoreria"),
       gerenciaComercial: this.findDepartmentApproval(aprobaciones, "gerenciaComercial"),
       gerencia: this.findDepartmentApproval(aprobaciones, "gerencia"),
       arquitecto: this.findDepartmentApproval(aprobaciones, "arquitecto"),
     }

     // Convertir form_data de JSON a objeto
     if (ticket.form_data) {
       try {
         // Si ya es un objeto, no necesitamos parsearlo
         if (typeof ticket.form_data === 'object' && ticket.form_data !== null) {
           ticket.formData = ticket.form_data;
         } else {
           // Si es una cadena, intentamos parsearlo
           ticket.formData = JSON.parse(ticket.form_data);
         }
       } catch (error) {
         console.error("Error al parsear form_data:", error);
         ticket.formData = {}; // Valor predeterminado en caso de error
       }
     }

     return ticket
   } catch (error) {
     console.error("Error en getTicketById:", error)
     throw new Error("Error al obtener el ticket: " + error.message)
   }
 }

 async createTicket(ticketData, userId) {
   const pool = getPool()
   const connection = await pool.getConnection()

   try {
     await connection.beginTransaction()

     // Generar un ID de ticket único
     const ticketId = `TICK-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`

     // Asegurarnos de que formData sea una cadena JSON válida
     let formDataJson;
     if (typeof ticketData.formData === 'string') {
       formDataJson = ticketData.formData;
     } else {
       formDataJson = JSON.stringify(ticketData.formData);
     }

     // Insertar el ticket
     const [result] = await connection.query(
       `
       INSERT INTO approval_tickets (
         ticket_id, 
         title, 
         emprendimiento, 
         unidad_funcional, 
         fecha_creacion, 
         estado, 
         creador_id,
         form_data
       ) VALUES (?, ?, ?, ?, NOW(), ?, ?, ?)
     `,
       [
         ticketId,
         ticketData.title || `Aprobación ${ticketData.formData.tipoDocumento || "Documento"}`,
         ticketData.formData.emprendimiento || "",
         ticketData.formData.unidadFuncional || "",
         "pendiente",
         userId,
         formDataJson,
       ],
     )

     const insertedId = result.insertId

     // Crear registros de aprobación vacíos para cada departamento
     const departamentos = ["contaduria", "legales", "tesoreria", "gerenciaComercial", "gerencia", "arquitecto"]

     for (const departamento of departamentos) {
       await connection.query(
         `
         INSERT INTO approval_signatures (
           ticket_id, 
           departamento, 
           aprobado, 
           usuario, 
           fecha, 
           comentarios
         ) VALUES (?, ?, 0, '', NULL, '')
       `,
         [insertedId, departamento],
       )
     }

     await connection.commit()

     // Obtener el ticket completo
     return await this.getTicketById(insertedId)
   } catch (error) {
     await connection.rollback()
     console.error("Error en createTicket:", error)
     throw new Error("Error al crear el ticket: " + error.message)
   } finally {
     connection.release()
   }
 }

 async updateTicket(id, ticketData) {
   const pool = getPool()
   try {
     // Verificar si el ticket existe
     const [existingTicket] = await pool.query(
       `
       SELECT * FROM approval_tickets
       WHERE id = ?
     `,
       [id],
     )

     if (existingTicket.length === 0) {
       return null
     }

     // Preparar los datos del formulario para actualizar
     let formDataJson;
     if (ticketData.formData) {
       if (typeof ticketData.formData === 'string') {
         formDataJson = ticketData.formData;
       } else {
         formDataJson = JSON.stringify(ticketData.formData);
       }
     } else {
       formDataJson = existingTicket[0].form_data;
     }

     // Actualizar el ticket
     await pool.query(
       `
       UPDATE approval_tickets
       SET 
         title = ?,
         emprendimiento = ?,
         unidad_funcional = ?,
         estado = ?,
         form_data = ?
       WHERE id = ?
     `,
       [
         ticketData.title || existingTicket[0].title,
         ticketData.formData?.emprendimiento || existingTicket[0].emprendimiento,
         ticketData.formData?.unidadFuncional || existingTicket[0].unidad_funcional,
         ticketData.estado || existingTicket[0].estado,
         formDataJson,
         id,
       ],
     )

     // Obtener el ticket actualizado
     return await this.getTicketById(id)
   } catch (error) {
     console.error("Error en updateTicket:", error)
     throw new Error("Error al actualizar el ticket: " + error.message)
   }
 }

 async deleteTicket(id) {
   const pool = getPool()
   const connection = await pool.getConnection()

   try {
     await connection.beginTransaction()

     // Verificar si el ticket existe
     const [existingTicket] = await connection.query(
       `
       SELECT * FROM approval_tickets
       WHERE id = ?
     `,
       [id],
     )

     if (existingTicket.length === 0) {
       await connection.rollback()
       return false
     }

     // Eliminar las aprobaciones
     await connection.query(
       `
       DELETE FROM approval_signatures
       WHERE ticket_id = ?
     `,
       [id],
     )

     // Eliminar el ticket
     await connection.query(
       `
       DELETE FROM approval_tickets
       WHERE id = ?
     `,
       [id],
     )

     await connection.commit()
     return true
   } catch (error) {
     await connection.rollback()
     console.error("Error en deleteTicket:", error)
     throw new Error("Error al eliminar el ticket: " + error.message)
   } finally {
     connection.release()
   }
 }

 async approveTicket(id, department, approved, userId, userName, comentarios = "") {
   const pool = getPool()
   const connection = await pool.getConnection()

   try {
     await connection.beginTransaction()

     // Verificar si el ticket existe
     const [existingTicket] = await connection.query(
       `
       SELECT * FROM approval_tickets
       WHERE id = ?
     `,
       [id],
     )

     if (existingTicket.length === 0) {
       await connection.rollback()
       return null
     }

     // Actualizar la aprobación
     await connection.query(
       `
       UPDATE approval_signatures
       SET 
         aprobado = ?,
         usuario = ?,
         fecha = NOW(),
         comentarios = ?
       WHERE ticket_id = ? AND departamento = ?
     `,
       [approved ? 1 : 0, userName, comentarios, id, department],
     )

     // Obtener todas las aprobaciones para determinar el estado general
     const [aprobaciones] = await connection.query(
       `
       SELECT * FROM approval_signatures
       WHERE ticket_id = ?
     `,
       [id],
     )

     // Determinar el nuevo estado
     let nuevoEstado = "pendiente"
     const totalDepartamentos = aprobaciones.length
     const aprobados = aprobaciones.filter((a) => a.aprobado === 1).length
     const rechazados = aprobaciones.filter((a) => a.usuario && a.aprobado === 0).length

     if (aprobados === totalDepartamentos) {
       nuevoEstado = "aprobado"
     } else if (rechazados > 0) {
       nuevoEstado = "rechazado"
     }

     // Actualizar el estado del ticket
     await connection.query(
       `
       UPDATE approval_tickets
       SET estado = ?
       WHERE id = ?
     `,
       [nuevoEstado, id],
     )

     await connection.commit()

     // Obtener el ticket actualizado
     return await this.getTicketById(id)
   } catch (error) {
     await connection.rollback()
     console.error("Error en approveTicket:", error)
     throw new Error("Error al aprobar el ticket: " + error.message)
   } finally {
     connection.release()
   }
 }

 async getTicketStats() {
   const pool = getPool()
   try {
     // Obtener estadísticas generales
     const [totalStats] = await pool.query(`
       SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
         SUM(CASE WHEN estado = 'aprobado' THEN 1 ELSE 0 END) as aprobados,
         SUM(CASE WHEN estado = 'rechazado' THEN 1 ELSE 0 END) as rechazados
       FROM approval_tickets
     `)

     // Obtener estadísticas por emprendimiento
     const [emprendimientoStats] = await pool.query(`
       SELECT 
         emprendimiento,
         COUNT(*) as total,
         SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
         SUM(CASE WHEN estado = 'aprobado' THEN 1 ELSE 0 END) as aprobados,
         SUM(CASE WHEN estado = 'rechazado' THEN 1 ELSE 0 END) as rechazados
       FROM approval_tickets
       GROUP BY emprendimiento
     `)

     // Obtener estadísticas por mes (últimos 6 meses)
     const [monthlyStats] = await pool.query(`
       SELECT 
         DATE_FORMAT(fecha_creacion, '%Y-%m') as mes,
         COUNT(*) as total,
         SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
         SUM(CASE WHEN estado = 'aprobado' THEN 1 ELSE 0 END) as aprobados,
         SUM(CASE WHEN estado = 'rechazado' THEN 1 ELSE 0 END) as rechazados
       FROM approval_tickets
       WHERE fecha_creacion >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
       GROUP BY DATE_FORMAT(fecha_creacion, '%Y-%m')
       ORDER BY mes DESC
     `)

     return {
       total: totalStats[0],
       porEmprendimiento: emprendimientoStats,
       porMes: monthlyStats,
     }
   } catch (error) {
     console.error("Error en getTicketStats:", error)
     throw new Error("Error al obtener estadísticas: " + error.message)
   }
 }

 async searchTickets(term) {
   const pool = getPool()
   try {
     const searchTerm = `%${term}%`
     const [rows] = await pool.query(
       `
       SELECT * FROM approval_tickets
       WHERE 
         ticket_id LIKE ? OR
         title LIKE ? OR
         emprendimiento LIKE ? OR
         unidad_funcional LIKE ? OR
         form_data LIKE ?
       ORDER BY fecha_creacion DESC
     `,
       [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm],
     )

     // Para cada ticket, obtener sus aprobaciones
     for (const ticket of rows) {
       const [aprobaciones] = await pool.query(
         `
         SELECT * FROM approval_signatures
         WHERE ticket_id = ?
       `,
         [ticket.id],
       )

       // Convertir las aprobaciones a un objeto estructurado
       ticket.aprobaciones = {
         contaduria: this.findDepartmentApproval(aprobaciones, "contaduria"),
         legales: this.findDepartmentApproval(aprobaciones, "legales"),
         tesoreria: this.findDepartmentApproval(aprobaciones, "tesoreria"),
         gerenciaComercial: this.findDepartmentApproval(aprobaciones, "gerenciaComercial"),
         gerencia: this.findDepartmentApproval(aprobaciones, "gerencia"),
         arquitecto: this.findDepartmentApproval(aprobaciones, "arquitecto"),
       }

       // Convertir form_data de JSON a objeto
       if (ticket.form_data) {
         try {
           // Si ya es un objeto, no necesitamos parsearlo
           if (typeof ticket.form_data === 'object' && ticket.form_data !== null) {
             ticket.formData = ticket.form_data;
           } else {
             // Si es una cadena, intentamos parsearlo
             ticket.formData = JSON.parse(ticket.form_data);
           }
         } catch (error) {
           console.error("Error al parsear form_data:", error);
           ticket.formData = {}; // Valor predeterminado en caso de error
         }
       }
     }

     return rows
   } catch (error) {
     console.error("Error en searchTickets:", error)
     throw new Error("Error al buscar tickets: " + error.message)
   }
 }
}

module.exports = new ChecklistService()