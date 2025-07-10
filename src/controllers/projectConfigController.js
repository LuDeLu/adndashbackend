const asyncHandler = require("../utils/asyncHandler")
const { getPool } = require("../config/database")
const path = require("path")
const fs = require("fs")

// Obtener configuración del proyecto
const getProjectConfiguration = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params
    const pool = getPool()

    // Validar que el ID sea un número válido
    if (!id || isNaN(Number.parseInt(id))) {
      return res.status(400).json({ message: "ID de proyecto inválido" })
    }

    const projectId = Number.parseInt(id)

    // Primero obtener el proyecto base
    const projectQuery = `
      SELECT 
        p.*,
        COUNT(DISTINCT f.id) as total_floors,
        COUNT(DISTINCT a.id) as total_units,
        COUNT(DISTINCT CASE WHEN a.status = 'libre' THEN a.id END) as available_units,
        COUNT(DISTINCT CASE WHEN a.status = 'reservado' THEN a.id END) as reserved_units,
        COUNT(DISTINCT CASE WHEN a.status = 'ocupado' THEN a.id END) as sold_units
      FROM projects p
      LEFT JOIN floors f ON p.id = f.project_id
      LEFT JOIN apartments a ON f.id = a.floor_id
      WHERE p.id = ?
      GROUP BY p.id
    `

    const [projectRows] = await pool.execute(projectQuery, [projectId])

    if (projectRows.length === 0) {
      return res.status(404).json({ message: "Proyecto no encontrado" })
    }

    const project = projectRows[0]

    // Obtener archivos del proyecto
    const filesQuery = `
      SELECT 
        id,
        file_name,
        file_type,
        file_path,
        floor_number,
        apartment_id,
        level,
        created_at
      FROM project_files 
      WHERE project_id = ?
      ORDER BY created_at DESC
    `

    const [filesRows] = await pool.execute(filesQuery, [projectId])

    // Obtener configuración de pisos
    const floorConfigQuery = `
      SELECT 
        id,
        floor_number,
        floor_name,
        view_box,
        background_image,
        apartment_config
      FROM project_floor_config 
      WHERE project_id = ?
      ORDER BY floor_number
    `

    const [floorConfigRows] = await pool.execute(floorConfigQuery, [projectId])

    // Helper function to safely parse JSON
    const safeJsonParse = (jsonString, defaultValue = null) => {
      if (typeof jsonString === "object" && jsonString !== null) return jsonString
      if (typeof jsonString === "string") {
        try {
          return JSON.parse(jsonString)
        } catch (e) {
          console.warn("Failed to parse JSON string:", jsonString, e)
          return defaultValue
        }
      }
      return defaultValue
    }

    // Procesar el proyecto
    const processedProject = {
      ...project,
      amenities: safeJsonParse(project.amenities, []),
      unit_types: safeJsonParse(project.unit_types, []),
      financial_options: safeJsonParse(project.financial_options, []),
      floors_config: safeJsonParse(project.floors_config, {}),
      building_config: safeJsonParse(project.building_config, {}),
      map_config: safeJsonParse(project.map_config, {}),
      parking_config: safeJsonParse(project.parking_config, {}),
    }

    // Procesar configuración de pisos
    const processedFloorConfig = floorConfigRows.map((fc) => ({
      ...fc,
      apartment_config: safeJsonParse(fc.apartment_config, {}),
    }))

    const response = {
      project: processedProject,
      files: filesRows,
      floorConfig: processedFloorConfig,
    }

    res.json(response)
  } catch (error) {
    console.error("Error al obtener configuración:", error)
    res.status(500).json({ message: "Error al obtener configuración del proyecto" })
  }
})

// Actualizar configuración del proyecto
const updateProjectConfiguration = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params
    const updateData = req.body
    const pool = getPool()

    // Validar que el ID sea un número válido
    if (!id || isNaN(Number.parseInt(id))) {
      return res.status(400).json({ message: "ID de proyecto inválido" })
    }

    const projectId = Number.parseInt(id)

    // Construir la consulta de actualización dinámicamente
    const fields = Object.keys(updateData).filter((key) => updateData[key] !== undefined)
    const values = fields.map((field) => updateData[field])

    if (fields.length === 0) {
      return res.status(400).json({ message: "No hay datos para actualizar" })
    }

    const setClause = fields.map((field) => `${field} = ?`).join(", ")
    const query = `UPDATE projects SET ${setClause} WHERE id = ?`

    await pool.execute(query, [...values, projectId])

    // Obtener el proyecto actualizado
    const [updatedRows] = await pool.execute("SELECT * FROM projects WHERE id = ?", [projectId])

    if (updatedRows.length === 0) {
      return res.status(404).json({ message: "Proyecto no encontrado" })
    }

    res.json(updatedRows[0])
  } catch (error) {
    console.error("Error al actualizar configuración:", error)
    res.status(500).json({ message: "Error al actualizar configuración" })
  }
})

// Subir archivo del proyecto
const uploadProjectFile = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params
    const { fileType, floorNumber, apartmentId, level } = req.body
    const pool = getPool()

    // Validar que el ID sea un número válido
    if (!id || isNaN(Number.parseInt(id))) {
      return res.status(400).json({ message: "ID de proyecto inválido" })
    }

    const projectId = Number.parseInt(id)

    if (!req.file) {
      return res.status(400).json({ message: "No se proporcionó archivo" })
    }

    const query = `
      INSERT INTO project_files (project_id, file_type, file_path, file_name, floor_number, apartment_id, level)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `

    const values = [
      projectId,
      fileType || "other",
      req.file.path,
      req.file.originalname,
      floorNumber && !isNaN(Number.parseInt(floorNumber)) ? Number.parseInt(floorNumber) : null,
      apartmentId || null,
      level && !isNaN(Number.parseInt(level)) ? Number.parseInt(level) : null,
    ]

    const [result] = await pool.execute(query, values)

    // Obtener el archivo insertado
    const [insertedFile] = await pool.execute("SELECT * FROM project_files WHERE id = ?", [result.insertId])

    res.status(201).json(insertedFile[0])
  } catch (error) {
    console.error("Error al subir archivo:", error)
    res.status(500).json({ message: "Error al subir archivo" })
  }
})

// Eliminar archivo del proyecto
const deleteProjectFile = asyncHandler(async (req, res) => {
  try {
    const { fileId } = req.params
    const pool = getPool()

    // Validar que el ID sea un número válido
    if (!fileId || isNaN(Number.parseInt(fileId))) {
      return res.status(400).json({ message: "ID de archivo inválido" })
    }

    const fileIdInt = Number.parseInt(fileId)

    // Obtener información del archivo
    const [fileRows] = await pool.execute("SELECT * FROM project_files WHERE id = ?", [fileIdInt])

    if (fileRows.length === 0) {
      return res.status(404).json({ message: "Archivo no encontrado" })
    }

    const file = fileRows[0]

    // Eliminar archivo físico si existe
    if (file.file_path && fs.existsSync(file.file_path)) {
      fs.unlinkSync(file.file_path)
    }

    // Eliminar registro de la base de datos
    await pool.execute("DELETE FROM project_files WHERE id = ?", [fileIdInt])

    res.json({ message: "Archivo eliminado correctamente" })
  } catch (error) {
    console.error("Error al eliminar archivo:", error)
    res.status(500).json({ message: "Error al eliminar archivo" })
  }
})

// Obtener planos de pisos
const getFloorPlans = asyncHandler(async (req, res) => {
  try {
    const { projectId } = req.params
    const pool = getPool()

    // Validar que el ID sea un número válido
    if (!projectId || isNaN(Number.parseInt(projectId))) {
      return res.status(400).json({ message: "ID de proyecto inválido" })
    }

    const projectIdInt = Number.parseInt(projectId)

    const query = `
      SELECT * FROM project_files 
      WHERE project_id = ? AND file_type = 'floor_plan'
      ORDER BY floor_number, created_at DESC
    `

    const [rows] = await pool.execute(query, [projectIdInt])
    res.json(rows)
  } catch (error) {
    console.error("Error al obtener planos:", error)
    res.status(500).json({ message: "Error al obtener planos de pisos" })
  }
})

// Obtener PDFs de apartamentos
const getApartmentPDFs = asyncHandler(async (req, res) => {
  try {
    const { projectId } = req.params
    const pool = getPool()

    // Validar que el ID sea un número válido
    if (!projectId || isNaN(Number.parseInt(projectId))) {
      return res.status(400).json({ message: "ID de proyecto inválido" })
    }

    const projectIdInt = Number.parseInt(projectId)

    const query = `
      SELECT * FROM project_files 
      WHERE project_id = ? AND file_type = 'apartment_pdf'
      ORDER BY apartment_id, created_at DESC
    `

    const [rows] = await pool.execute(query, [projectIdInt])
    res.json(rows)
  } catch (error) {
    console.error("Error al obtener PDFs:", error)
    res.status(500).json({ message: "Error al obtener PDFs de apartamentos" })
  }
})

// Obtener planos de garaje
const getGaragePlans = asyncHandler(async (req, res) => {
  try {
    const { projectId } = req.params
    const pool = getPool()

    // Validar que el ID sea un número válido
    if (!projectId || isNaN(Number.parseInt(projectId))) {
      return res.status(400).json({ message: "ID de proyecto inválido" })
    }

    const projectIdInt = Number.parseInt(projectId)

    const query = `
      SELECT * FROM project_files 
      WHERE project_id = ? AND file_type = 'garage_plan'
      ORDER BY level, created_at DESC
    `

    const [rows] = await pool.execute(query, [projectIdInt])
    res.json(rows)
  } catch (error) {
    console.error("Error al obtener planos de garaje:", error)
    res.status(500).json({ message: "Error al obtener planos de garaje" })
  }
})

module.exports = {
  getProjectConfiguration,
  updateProjectConfiguration,
  uploadProjectFile,
  deleteProjectFile,
  getFloorPlans,
  getApartmentPDFs,
  getGaragePlans,
}
