const express = require("express")
const router = express.Router()
const { getPool } = require("../config/database")
const { authenticateToken } = require('../middleware/auth');

router.get("/global", authenticateToken, async (req, res) => {
  try {
    const pool = getPool()

    // Obtener estadísticas de todos los proyectos
    const [projectStats] = await pool.execute(`
      SELECT 
        p.id,
        p.name,
        COUNT(DISTINCT f.id) as total_floors,
        COUNT(DISTINCT a.id) as total_units,
        SUM(CASE WHEN a.status = 'available' THEN 1 ELSE 0 END) as available_units,
        SUM(CASE WHEN a.status = 'reserved' THEN 1 ELSE 0 END) as reserved_units,
        SUM(CASE WHEN a.status = 'sold' THEN 1 ELSE 0 END) as sold_units,
        SUM(CASE WHEN a.status = 'blocked' THEN 1 ELSE 0 END) as blocked_units,
        SUM(CASE WHEN a.status = 'sold' OR a.status = 'reserved' THEN a.price ELSE 0 END) as total_sales_value,
        AVG(a.price) as avg_price
      FROM projects p
      LEFT JOIN floors f ON p.id = f.project_id
      LEFT JOIN apartments a ON f.id = a.floor_id
      GROUP BY p.id, p.name
    `)

    // Obtener total de tickets de postventa
    const [ticketStats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_tickets,
        SUM(CASE WHEN status = 'pendiente' OR status = 'Pendiente' THEN 1 ELSE 0 END) as pending_tickets,
        SUM(CASE WHEN status = 'en_proceso' OR status = 'En Proceso' THEN 1 ELSE 0 END) as in_process_tickets,
        SUM(CASE WHEN status = 'resuelto' OR status = 'Completado' THEN 1 ELSE 0 END) as resolved_tickets
      FROM checklist_tickets
    `)

    const globalStats = {
      total_projects: projectStats.length,
      total_units: projectStats.reduce((sum, p) => sum + Number(p.total_units || 0), 0),
      available_units: projectStats.reduce((sum, p) => sum + Number(p.available_units || 0), 0),
      reserved_units: projectStats.reduce((sum, p) => sum + Number(p.reserved_units || 0), 0),
      sold_units: projectStats.reduce((sum, p) => sum + Number(p.sold_units || 0), 0),
      blocked_units: projectStats.reduce((sum, p) => sum + Number(p.blocked_units || 0), 0),
      total_sales_value: projectStats.reduce((sum, p) => sum + Number(p.total_sales_value || 0), 0),
      delivered_units: Math.floor(projectStats.reduce((sum, p) => sum + Number(p.sold_units || 0), 0) * 0.8),
      projects: projectStats.map((p) => ({
        id: p.id,
        name: p.name,
        totalUnits: Number(p.total_units || 0),
        availableUnits: Number(p.available_units || 0),
        reservedUnits: Number(p.reserved_units || 0),
        soldUnits: Number(p.sold_units || 0),
        deliveredUnits: Math.floor(Number(p.sold_units || 0) * 0.8),
        avgPrice: Number(p.avg_price || 75000),
        totalSalesValue: Number(p.total_sales_value || 0),
      })),
      tickets: ticketStats[0] || { total_tickets: 0, pending_tickets: 0, in_process_tickets: 0, resolved_tickets: 0 },
    }

    res.json(globalStats)
  } catch (error) {
    console.error("Error al obtener estadísticas globales:", error)
    res.status(500).json({ message: "Error al obtener estadísticas", error: error.message })
  }
})

module.exports = router
