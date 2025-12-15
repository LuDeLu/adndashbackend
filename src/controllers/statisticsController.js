const asyncHandler = require("../utils/asyncHandler")
const { getPool } = require("../config/database")

const getGlobalStatistics = asyncHandler(async (req, res) => {
  try {
    const pool = getPool()

    // Get all projects with their units from the database
    const projectsQuery = `
      SELECT 
        p.id,
        p.name,
        COUNT(DISTINCT a.id) as total_units,
        COUNT(DISTINCT CASE WHEN a.status = 'available' THEN a.id END) as available_units,
        COUNT(DISTINCT CASE WHEN a.status = 'reserved' THEN a.id END) as reserved_units,
        COUNT(DISTINCT CASE WHEN a.status = 'sold' THEN a.id END) as sold_units,
        COUNT(DISTINCT CASE WHEN a.delivered = 1 THEN a.id END) as delivered_units,
        AVG(a.price) as avg_price,
        SUM(CASE WHEN a.status IN ('sold', 'reserved') THEN a.price ELSE 0 END) as total_sales_value
      FROM projects p
      LEFT JOIN floors f ON p.id = f.project_id
      LEFT JOIN apartments a ON f.id = a.floor_id
      GROUP BY p.id, p.name
      ORDER BY p.name
    `

    const [projects] = await pool.execute(projectsQuery)

    // Calculate totals
    const totalProjects = projects.length
    let totalUnits = 0
    let totalAvailableUnits = 0
    let totalReservedUnits = 0
    let totalSoldUnits = 0
    let totalDeliveredUnits = 0
    let totalSalesValue = 0

    const projectStats = projects.map((project) => {
      const total = Number.parseInt(project.total_units) || 0
      const available = Number.parseInt(project.available_units) || 0
      const reserved = Number.parseInt(project.reserved_units) || 0
      const sold = Number.parseInt(project.sold_units) || 0
      const delivered = Number.parseInt(project.delivered_units) || 0
      const salesValue = Number.parseFloat(project.total_sales_value) || 0

      totalUnits += total
      totalAvailableUnits += available
      totalReservedUnits += reserved
      totalSoldUnits += sold
      totalDeliveredUnits += delivered
      totalSalesValue += salesValue

      return {
        id: project.id,
        name: project.name,
        totalUnits: total,
        availableUnits: available,
        reservedUnits: reserved,
        soldUnits: sold,
        deliveredUnits: delivered,
        avgPrice: Number.parseFloat(project.avg_price) || 0,
        totalSalesValue: salesValue,
      }
    })

    // Get tickets count
    const ticketsQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Pendiente' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'En Proceso' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'Completado' THEN 1 ELSE 0 END) as completed
      FROM 	reclamos
    `

    const [ticketStats] = await pool.execute(ticketsQuery)
    const tickets = ticketStats[0] || { total: 0, pending: 0, in_progress: 0, completed: 0 }

    // Return consolidated statistics
    res.json({
      totalProjects,
      totalUnits,
      totalAvailableUnits,
      totalReservedUnits,
      totalSoldUnits,
      totalDeliveredUnits,
      totalSalesValue,
      totalTickets: Number.parseInt(tickets.total) || 0,
      pendingTickets: Number.parseInt(tickets.pending) || 0,
      inProgressTickets: Number.parseInt(tickets.in_progress) || 0,
      completedTickets: Number.parseInt(tickets.completed) || 0,
      projects: projectStats,
    })
  } catch (error) {
    console.error("Error fetching global statistics:", error)
    res.status(500).json({
      message: "Error al obtener estadísticas globales",
      error: error.message,
    })
  }
})

module.exports = {
  getGlobalStatistics,
}
