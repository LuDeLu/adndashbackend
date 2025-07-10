const { getPool } = require("../config/database")

const getActivityLogsByProjectId = async (req, res) => {
  try {
    const { projectId } = req.params
    console.log(`Fetching activity logs for project ${projectId}`)

    // Verificar que el pool esté disponible
    let pool
    try {
      pool = getPool()
    } catch (error) {
      console.error("Database pool not available:", error)
      return res.status(503).json({
        error: "Database connection not available",
        message: "Please try again in a moment",
      })
    }

    const query = `
      SELECT 
        al.*,
        u.nombre as user_name,
        u.apellido as user_lastname
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.project_id = ?
      ORDER BY al.created_at DESC
    `

    const [rows] = await pool.execute(query, [projectId])

    console.log(`Found ${rows.length} activity logs for project ${projectId}`)
    res.json(rows)
  } catch (error) {
    console.error("Error fetching activity logs:", error)
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    })
  }
}

const createActivityLog = async (req, res) => {
  try {
    const { user_id, project_id, action_type, description } = req.body

    // Verificar que el pool esté disponible
    let pool
    try {
      pool = getPool()
    } catch (error) {
      console.error("Database pool not available:", error)
      return res.status(503).json({
        error: "Database connection not available",
      })
    }

    const query = `
      INSERT INTO activity_logs (user_id, project_id, action_type, description)
      VALUES (?, ?, ?, ?)
    `

    const [result] = await pool.execute(query, [user_id, project_id, action_type, description])

    res.status(201).json({
      id: result.insertId,
      message: "Activity log created successfully",
    })
  } catch (error) {
    console.error("Error creating activity log:", error)
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    })
  }
}

const getAllActivityLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, project_id, user_id, action_type } = req.query

    // Verificar que el pool esté disponible
    let pool
    try {
      pool = getPool()
    } catch (error) {
      console.error("Database pool not available:", error)
      return res.status(503).json({
        error: "Database connection not available",
      })
    }

    const offset = (page - 1) * limit
    const whereConditions = []
    const queryParams = []

    // Construir condiciones WHERE dinámicamente
    if (project_id) {
      whereConditions.push("al.project_id = ?")
      queryParams.push(project_id)
    }

    if (user_id) {
      whereConditions.push("al.user_id = ?")
      queryParams.push(user_id)
    }

    if (action_type) {
      whereConditions.push("al.action_type = ?")
      queryParams.push(action_type)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : ""

    const query = `
      SELECT 
        al.*,
        u.nombre as user_name,
        u.apellido as user_lastname,
        p.name as project_name
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN projects p ON al.project_id = p.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?
    `

    queryParams.push(Number.parseInt(limit), Number.parseInt(offset))
    const [rows] = await pool.execute(query, queryParams)

    // Contar total de registros
    const countQuery = `
      SELECT COUNT(*) as total
      FROM activity_logs al
      ${whereClause}
    `
    const countParams = queryParams.slice(0, -2) // Remover limit y offset
    const [countResult] = await pool.execute(countQuery, countParams)
    const total = countResult[0].total

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching all activity logs:", error)
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    })
  }
}

module.exports = {
  getActivityLogsByProjectId,
  createActivityLog,
  getAllActivityLogs,
}
