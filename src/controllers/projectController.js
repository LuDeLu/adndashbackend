const asyncHandler = require("../utils/asyncHandler")
const { getPool } = require("../config/database")

// Función para validar IDs
const validateId = (id, paramName = "ID") => {
  if (!id || id === "undefined" || id === "null" || isNaN(Number.parseInt(id))) {
    throw new Error(`${paramName} inválido: ${id}`)
  }
  return Number.parseInt(id)
}

// Función para parsing seguro de JSON
const safeJsonParse = (jsonString, defaultValue = null) => {
  if (!jsonString || jsonString === "null" || jsonString === "undefined") {
    return defaultValue
  }
  try {
    return JSON.parse(jsonString)
  } catch (error) {
    console.warn("Error parsing JSON:", jsonString, error)
    return defaultValue
  }
}

// Obtener todos los proyectos
const getAllProjects = asyncHandler(async (req, res) => {
  try {
    const pool = getPool()

    const query = `
      SELECT 
        p.*,
        COUNT(DISTINCT f.id) as total_floors,
        COUNT(DISTINCT a.id) as total_units,
        COUNT(DISTINCT CASE WHEN a.status = 'available' THEN a.id END) as available_units,
        COUNT(DISTINCT CASE WHEN a.status = 'reserved' THEN a.id END) as reserved_units,
        COUNT(DISTINCT CASE WHEN a.status = 'sold' THEN a.id END) as sold_units
      FROM projects p
      LEFT JOIN floors f ON p.id = f.project_id
      LEFT JOIN apartments a ON f.id = a.floor_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `

    const [rows] = await pool.execute(query)

    // Procesar los datos para asegurar que los campos JSON se parseen correctamente
    const processedProjects = rows.map((project) => ({
      ...project,
      amenities: safeJsonParse(project.amenities, []),
      unit_types: safeJsonParse(project.unit_types, []),
      financial_options: safeJsonParse(project.financial_options, []),
      parking_config: safeJsonParse(project.parking_config, {}),
      map_config: safeJsonParse(project.map_config, {}),
      building_config: safeJsonParse(project.building_config, {}),
      floors_config: safeJsonParse(project.floors_config, {}),
    }))

    res.json(processedProjects)
  } catch (error) {
    console.error("Error al obtener proyectos:", error)
    res.status(500).json({ message: "Error al obtener proyectos" })
  }
})

// Obtener proyecto por ID
const getProjectById = asyncHandler(async (req, res) => {
  try {
    const projectId = validateId(req.params.id, "Project ID")
    const pool = getPool()

    const query = `
      SELECT 
        p.*,
        COUNT(DISTINCT f.id) as total_floors,
        COUNT(DISTINCT a.id) as total_units,
        COUNT(DISTINCT CASE WHEN a.status = 'available' THEN a.id END) as available_units,
        COUNT(DISTINCT CASE WHEN a.status = 'reserved' THEN a.id END) as reserved_units,
        COUNT(DISTINCT CASE WHEN a.status = 'sold' THEN a.id END) as sold_units
      FROM projects p
      LEFT JOIN floors f ON p.id = f.project_id
      LEFT JOIN apartments a ON f.id = a.floor_id
      WHERE p.id = ?
      GROUP BY p.id
    `

    const [rows] = await pool.execute(query, [projectId])

    if (rows.length === 0) {
      return res.status(404).json({ message: "Proyecto no encontrado" })
    }

    const project = rows[0]

    // Procesar campos JSON
    const processedProject = {
      ...project,
      amenities: safeJsonParse(project.amenities, []),
      unit_types: safeJsonParse(project.unit_types, []),
      financial_options: safeJsonParse(project.financial_options, []),
      parking_config: safeJsonParse(project.parking_config, {}),
      map_config: safeJsonParse(project.map_config, {}),
      building_config: safeJsonParse(project.building_config, {}),
      floors_config: safeJsonParse(project.floors_config, {}),
    }

    res.json(processedProject)
  } catch (error) {
    console.error("Error al obtener proyecto:", error)
    res.status(500).json({ message: "Error al obtener proyecto" })
  }
})

// Crear nuevo proyecto
const createProject = asyncHandler(async (req, res) => {
  try {
    const { name, location } = req.body
    const pool = getPool()

    if (!name || !location) {
      return res.status(400).json({ message: "Nombre y ubicación son requeridos" })
    }

    const query = `
      INSERT INTO projects (name, location, created_at, updated_at)
      VALUES (?, ?, NOW(), NOW())
    `

    const [result] = await pool.execute(query, [name, location])

    // Obtener el proyecto creado
    const [newProject] = await pool.execute("SELECT * FROM projects WHERE id = ?", [result.insertId])

    res.status(201).json(newProject[0])
  } catch (error) {
    console.error("Error al crear proyecto:", error)
    res.status(500).json({ message: "Error al crear proyecto" })
  }
})

// Obtener configuración completa de un proyecto
const getProjectConfiguration = asyncHandler(async (req, res) => {
  try {
    const projectId = validateId(req.params.id, "Project ID")
    const pool = getPool()

    console.log(`Obteniendo configuración para proyecto ID: ${projectId}`)

    // Consulta principal con JOINs optimizados
    const query = `
      SELECT 
        p.id as project_id,
        p.name as project_name,
        p.description as project_description,
        p.location as project_location,
        p.status as project_status,
        p.created_at as project_created_at,
        
        f.id as floor_id,
        f.floor_number,
        f.floor_name,
        f.svg_path as floor_svg_path,
        
        a.id as apartment_id,
        a.apartment_id as apartment_number,
        a.apartment_name,
        a.status as apartment_status,
        a.price,
        a.area,
        a.buyer_name,
        a.buyer_phone,
        a.buyer_email,
        a.reservation_date,
        a.notes as apartment_notes,
        a.svg_path as apartment_svg_path,
        
        ps.id as parking_spot_id,
        ps.parking_id as parking_number,
        ps.level as parking_level,
        ps.status as parking_status,
        ps.svg_path as parking_svg_path,
        ps.notes as parking_notes
        
      FROM projects p
      LEFT JOIN floors f ON p.id = f.project_id
      LEFT JOIN apartments a ON f.id = a.floor_id
      LEFT JOIN parking_spots ps ON a.id = ps.apartment_id
      WHERE p.id = ?
      ORDER BY f.floor_number ASC, a.apartment_id ASC, ps.parking_id ASC
    `

    const [rows] = await pool.execute(query, [projectId])

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Proyecto no encontrado",
      })
    }

    // Obtener archivos del proyecto
    const [filesRows] = await pool.execute(
      "SELECT * FROM project_files WHERE project_id = ? ORDER BY created_at DESC",
      [projectId],
    )

    // Obtener configuraciones del proyecto
    const [settingsRows] = await pool.execute(
      "SELECT setting_key, setting_value FROM project_settings WHERE project_id = ?",
      [projectId],
    )

    // Procesar y estructurar los datos
    const projectData = {
      id: rows[0].project_id,
      name: rows[0].project_name,
      description: rows[0].project_description,
      location: rows[0].project_location,
      status: rows[0].project_status,
      created_at: rows[0].project_created_at,
      floors: {},
      files: filesRows,
      settings: {},
      statistics: {
        total_floors: 0,
        total_apartments: 0,
        total_parking_spots: 0,
        apartments_by_status: {
          available: 0,
          reserved: 0,
          sold: 0,
          blocked: 0,
        },
        parking_by_status: {
          available: 0,
          occupied: 0,
        },
      },
    }

    // Convertir configuraciones a objeto
    settingsRows.forEach((row) => {
      projectData.settings[row.setting_key] = safeJsonParse(row.setting_value, row.setting_value)
    })

    // Procesar filas y agrupar datos
    const processedFloors = new Set()
    const processedApartments = new Set()
    const processedParkingSpots = new Set()

    rows.forEach((row) => {
      // Procesar pisos
      if (row.floor_id && !processedFloors.has(row.floor_id)) {
        processedFloors.add(row.floor_id)
        projectData.floors[row.floor_number] = {
          id: row.floor_id,
          floor_number: row.floor_number,
          floor_name: row.floor_name,
          svg_path: safeJsonParse(row.floor_svg_path, row.floor_svg_path),
          apartments: {},
          statistics: {
            total_apartments: 0,
            available: 0,
            reserved: 0,
            sold: 0,
            blocked: 0,
          },
        }
        projectData.statistics.total_floors++
      }

      // Procesar apartamentos
      if (row.apartment_id && !processedApartments.has(row.apartment_id)) {
        processedApartments.add(row.apartment_id)

        const floorNumber = row.floor_number
        if (projectData.floors[floorNumber]) {
          projectData.floors[floorNumber].apartments[row.apartment_number] = {
            id: row.apartment_id,
            apartment_id: row.apartment_number,
            apartment_name: row.apartment_name,
            status: row.apartment_status,
            price: Number.parseFloat(row.price) || 0,
            area: Number.parseFloat(row.area) || 0,
            buyer_name: row.buyer_name,
            buyer_phone: row.buyer_phone,
            buyer_email: row.buyer_email,
            reservation_date: row.reservation_date,
            notes: row.apartment_notes,
            svg_path: safeJsonParse(row.apartment_svg_path, row.apartment_svg_path),
            parking_spots: [],
          }

          // Actualizar estadísticas
          projectData.statistics.total_apartments++
          projectData.statistics.apartments_by_status[row.apartment_status]++
          projectData.floors[floorNumber].statistics.total_apartments++
          projectData.floors[floorNumber].statistics[row.apartment_status]++
        }
      }

      // Procesar cocheras
      if (row.parking_spot_id && !processedParkingSpots.has(row.parking_spot_id)) {
        processedParkingSpots.add(row.parking_spot_id)

        const floorNumber = row.floor_number
        const apartmentNumber = row.apartment_number

        if (projectData.floors[floorNumber] && projectData.floors[floorNumber].apartments[apartmentNumber]) {
          projectData.floors[floorNumber].apartments[apartmentNumber].parking_spots.push({
            id: row.parking_spot_id,
            parking_id: row.parking_number,
            level: row.parking_level,
            status: row.parking_status,
            svg_path: safeJsonParse(row.parking_svg_path, row.parking_svg_path),
            notes: row.parking_notes,
          })

          projectData.statistics.total_parking_spots++
          projectData.statistics.parking_by_status[row.parking_status]++
        }
      }
    })

    console.log(`Configuración obtenida exitosamente para proyecto ${projectId}`)
    console.log(
      `Estadísticas: ${projectData.statistics.total_floors} pisos, ${projectData.statistics.total_apartments} apartamentos, ${projectData.statistics.total_parking_spots} cocheras`,
    )

    res.json({
      success: true,
      data: projectData,
    })
  } catch (error) {
    console.error("Error obteniendo configuración del proyecto:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    })
  }
})

// Obtener estadísticas de un proyecto específico
const getProjectStatistics = asyncHandler(async (req, res) => {
  try {
    const projectId = validateId(req.params.projectId, "Project ID")
    const pool = getPool()

    const query = `
      SELECT 
        COUNT(DISTINCT f.id) as total_floors,
        COUNT(DISTINCT a.id) as total_apartments,
        COUNT(DISTINCT ps.id) as total_parking_spots,
        SUM(CASE WHEN a.status = 'available' THEN 1 ELSE 0 END) as available_apartments,
        SUM(CASE WHEN a.status = 'reserved' THEN 1 ELSE 0 END) as reserved_apartments,
        SUM(CASE WHEN a.status = 'sold' THEN 1 ELSE 0 END) as sold_apartments,
        SUM(CASE WHEN a.status = 'blocked' THEN 1 ELSE 0 END) as blocked_apartments,
        SUM(CASE WHEN ps.status = 'available' THEN 1 ELSE 0 END) as available_parking,
        SUM(CASE WHEN ps.status = 'occupied' THEN 1 ELSE 0 END) as occupied_parking,
        AVG(a.price) as average_price,
        SUM(a.price) as total_value,
        AVG(a.area) as average_area,
        SUM(a.area) as total_area
      FROM projects p
      LEFT JOIN floors f ON p.id = f.project_id
      LEFT JOIN apartments a ON f.id = a.floor_id
      LEFT JOIN parking_spots ps ON a.id = ps.apartment_id
      WHERE p.id = ?
      GROUP BY p.id
    `

    const [rows] = await pool.execute(query, [projectId])

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Proyecto no encontrado",
      })
    }

    const stats = rows[0]

    res.json({
      success: true,
      data: {
        total_floors: Number.parseInt(stats.total_floors) || 0,
        total_apartments: Number.parseInt(stats.total_apartments) || 0,
        total_parking_spots: Number.parseInt(stats.total_parking_spots) || 0,
        apartments_by_status: {
          available: Number.parseInt(stats.available_apartments) || 0,
          reserved: Number.parseInt(stats.reserved_apartments) || 0,
          sold: Number.parseInt(stats.sold_apartments) || 0,
          blocked: Number.parseInt(stats.blocked_apartments) || 0,
        },
        parking_by_status: {
          available: Number.parseInt(stats.available_parking) || 0,
          occupied: Number.parseInt(stats.occupied_parking) || 0,
        },
        financial: {
          average_price: Number.parseFloat(stats.average_price) || 0,
          total_value: Number.parseFloat(stats.total_value) || 0,
          average_area: Number.parseFloat(stats.average_area) || 0,
          total_area: Number.parseFloat(stats.total_area) || 0,
        },
      },
    })
  } catch (error) {
    console.error("Error obteniendo estadísticas del proyecto:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    })
  }
})

// Obtener estadísticas por piso
const getFloorStats = asyncHandler(async (req, res) => {
  try {
    const projectId = validateId(req.params.projectId, "Project ID")
    const floorNumber = validateId(req.params.floorNumber, "Floor Number")
    const pool = getPool()

    const query = `
      SELECT 
        f.floor_number,
        COUNT(a.id) as total_units,
        COUNT(CASE WHEN a.status = 'available' THEN 1 END) as availableUnits,
        COUNT(CASE WHEN a.status = 'reserved' THEN 1 END) as reservedUnits,
        COUNT(CASE WHEN a.status = 'sold' THEN 1 END) as soldUnits
      FROM floors f
      LEFT JOIN apartments a ON f.id = a.floor_id
      WHERE f.project_id = ? AND f.floor_number = ?
      GROUP BY f.id, f.floor_number
    `

    const [rows] = await pool.execute(query, [projectId, floorNumber])

    if (rows.length === 0) {
      return res.json({
        floor_number: floorNumber,
        total_units: 0,
        availableUnits: 0,
        reservedUnits: 0,
        soldUnits: 0,
      })
    }

    res.json(rows[0])
  } catch (error) {
    console.error("Error al obtener estadísticas del piso:", error)
    res.status(500).json({ message: "Error al obtener estadísticas del piso" })
  }
})

// Obtener pisos del proyecto
const getProjectFloors = asyncHandler(async (req, res) => {
  try {
    const projectId = validateId(req.params.projectId, "Project ID")
    const pool = getPool()

    const query = `
      SELECT 
        f.id,
        f.floor_number,
        f.view_box,
        COUNT(a.id) as total_apartments,
        COUNT(CASE WHEN a.status = 'available' THEN 1 END) as available_apartments,
        COUNT(CASE WHEN a.status = 'reserved' THEN 1 END) as reserved_apartments,
        COUNT(CASE WHEN a.status = 'sold' THEN 1 END) as sold_apartments
      FROM floors f
      LEFT JOIN apartments a ON f.id = a.floor_id
      WHERE f.project_id = ?
      GROUP BY f.id, f.floor_number, f.view_box
      ORDER BY f.floor_number
    `

    const [rows] = await pool.execute(query, [projectId])
    res.json(rows)
  } catch (error) {
    console.error("Error al obtener pisos:", error)
    res.status(500).json({ message: "Error al obtener pisos del proyecto" })
  }
})

// Obtener apartamentos del proyecto
const getProjectApartments = asyncHandler(async (req, res) => {
  try {
    const projectId = validateId(req.params.projectId, "Project ID")
    const { floor, status } = req.query
    const pool = getPool()

    let query = `
      SELECT 
        a.*,
        f.floor_number
      FROM apartments a
      JOIN floors f ON a.floor_id = f.id
      WHERE f.project_id = ?
    `

    const params = [projectId]

    if (floor) {
      query += " AND f.floor_number = ?"
      params.push(floor)
    }

    if (status) {
      query += " AND a.status = ?"
      params.push(status)
    }

    query += " ORDER BY f.floor_number, a.apartment_id"

    const [rows] = await pool.execute(query, params)
    res.json(rows)
  } catch (error) {
    console.error("Error al obtener apartamentos:", error)
    res.status(500).json({ message: "Error al obtener apartamentos del proyecto" })
  }
})

module.exports = {
  getAllProjects,
  getProjectById,
  createProject,
  getProjectConfiguration,
  getProjectStatistics,
  getFloorStats,
  getProjectFloors,
  getProjectApartments,
}
