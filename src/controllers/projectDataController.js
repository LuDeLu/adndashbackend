const fs = require("fs")
const path = require("path")

// Directory where project JSON files will be stored
const DATA_DIR = path.join(__dirname, "../data/projects")

// Ensure the data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

// Valid project names
const VALID_PROJECTS = ["lagos", "apart", "beruti", "boulevard", "suites", "resi"]

// Get the file path for a project
const getProjectFilePath = (projectName) => {
  return path.join(DATA_DIR, `${projectName}.json`)
}

// Initialize empty project data structure
const getEmptyProjectData = (projectName) => ({
  project: projectName,
  owners: {},
  statuses: {},
  parkingAssignments: {}, // New field for parking assignments per unit
  updatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
})

// Read project data from JSON file
const readProjectData = (projectName) => {
  const filePath = getProjectFilePath(projectName)

  if (!fs.existsSync(filePath)) {
    // Create empty file if it doesn't exist
    const emptyData = getEmptyProjectData(projectName)
    fs.writeFileSync(filePath, JSON.stringify(emptyData, null, 2))
    return emptyData
  }

  try {
    const data = fs.readFileSync(filePath, "utf8")
    const parsedData = JSON.parse(data)
    if (!parsedData.parkingAssignments) {
      parsedData.parkingAssignments = {}
    }
    return parsedData
  } catch (error) {
    console.error(`Error reading project data for ${projectName}:`, error)
    return getEmptyProjectData(projectName)
  }
}

// Write project data to JSON file
const writeProjectData = (projectName, data) => {
  const filePath = getProjectFilePath(projectName)
  data.updatedAt = new Date().toISOString()

  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
    return true
  } catch (error) {
    console.error(`Error writing project data for ${projectName}:`, error)
    return false
  }
}

// GET /api/project-data/:projectName - Get all data for a project
exports.getProjectData = async (req, res) => {
  try {
    const { projectName } = req.params

    if (!VALID_PROJECTS.includes(projectName)) {
      return res.status(400).json({
        success: false,
        message: `Invalid project name. Valid projects: ${VALID_PROJECTS.join(", ")}`,
      })
    }

    const data = readProjectData(projectName)
    res.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error("Error getting project data:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener datos del proyecto",
    })
  }
}

// PUT /api/project-data/:projectName - Update all data for a project
exports.updateProjectData = async (req, res) => {
  try {
    const { projectName } = req.params
    const { owners, statuses, parkingAssignments } = req.body

    if (!VALID_PROJECTS.includes(projectName)) {
      return res.status(400).json({
        success: false,
        message: `Invalid project name. Valid projects: ${VALID_PROJECTS.join(", ")}`,
      })
    }

    const currentData = readProjectData(projectName)

    const updatedData = {
      ...currentData,
      owners: owners || currentData.owners,
      statuses: statuses || currentData.statuses,
      parkingAssignments: parkingAssignments || currentData.parkingAssignments,
    }

    const success = writeProjectData(projectName, updatedData)

    if (success) {
      res.json({
        success: true,
        message: "Datos del proyecto actualizados",
        data: updatedData,
      })
    } else {
      res.status(500).json({
        success: false,
        message: "Error al guardar los datos",
      })
    }
  } catch (error) {
    console.error("Error updating project data:", error)
    res.status(500).json({
      success: false,
      message: "Error al actualizar datos del proyecto",
    })
  }
}

// POST /api/project-data/:projectName/owner - Add or update an owner for a unit
exports.addOwner = async (req, res) => {
  try {
    const { projectName } = req.params
    const { unitId, owner } = req.body

    if (!VALID_PROJECTS.includes(projectName)) {
      return res.status(400).json({
        success: false,
        message: `Invalid project name. Valid projects: ${VALID_PROJECTS.join(", ")}`,
      })
    }

    if (!unitId || !owner) {
      return res.status(400).json({
        success: false,
        message: "unitId and owner are required",
      })
    }

    const data = readProjectData(projectName)
    data.owners[unitId] = {
      ...owner,
      assignedAt: owner.assignedAt || new Date().toISOString(),
    }

    const success = writeProjectData(projectName, data)

    if (success) {
      res.json({
        success: true,
        message: `Propietario asignado a unidad ${unitId}`,
        data: data.owners[unitId],
      })
    } else {
      res.status(500).json({
        success: false,
        message: "Error al guardar el propietario",
      })
    }
  } catch (error) {
    console.error("Error adding owner:", error)
    res.status(500).json({
      success: false,
      message: "Error al agregar propietario",
    })
  }
}

// DELETE /api/project-data/:projectName/owner/:unitId - Remove owner from a unit
exports.removeOwner = async (req, res) => {
  try {
    const { projectName, unitId } = req.params

    if (!VALID_PROJECTS.includes(projectName)) {
      return res.status(400).json({
        success: false,
        message: `Invalid project name. Valid projects: ${VALID_PROJECTS.join(", ")}`,
      })
    }

    const data = readProjectData(projectName)

    if (data.owners[unitId]) {
      delete data.owners[unitId]
      writeProjectData(projectName, data)
    }

    res.json({
      success: true,
      message: `Propietario eliminado de unidad ${unitId}`,
    })
  } catch (error) {
    console.error("Error removing owner:", error)
    res.status(500).json({
      success: false,
      message: "Error al eliminar propietario",
    })
  }
}

// POST /api/project-data/:projectName/status - Update status for a unit
exports.updateStatus = async (req, res) => {
  try {
    const { projectName } = req.params
    const { unitId, status } = req.body

    if (!VALID_PROJECTS.includes(projectName)) {
      return res.status(400).json({
        success: false,
        message: `Invalid project name. Valid projects: ${VALID_PROJECTS.join(", ")}`,
      })
    }

    if (!unitId || !status) {
      return res.status(400).json({
        success: false,
        message: "unitId and status are required",
      })
    }

    const data = readProjectData(projectName)
    data.statuses[unitId] = {
      ...status,
      changedAt: status.changedAt || new Date().toISOString(),
    }

    const success = writeProjectData(projectName, data)

    if (success) {
      res.json({
        success: true,
        message: `Estado actualizado para unidad ${unitId}`,
        data: data.statuses[unitId],
      })
    } else {
      res.status(500).json({
        success: false,
        message: "Error al guardar el estado",
      })
    }
  } catch (error) {
    console.error("Error updating status:", error)
    res.status(500).json({
      success: false,
      message: "Error al actualizar estado",
    })
  }
}

exports.assignParking = async (req, res) => {
  try {
    const { projectName } = req.params
    const { unitId, parkingSpots } = req.body

    if (!VALID_PROJECTS.includes(projectName)) {
      return res.status(400).json({
        success: false,
        message: `Invalid project name. Valid projects: ${VALID_PROJECTS.join(", ")}`,
      })
    }

    if (!unitId || !parkingSpots) {
      return res.status(400).json({
        success: false,
        message: "unitId and parkingSpots are required",
      })
    }

    const data = readProjectData(projectName)

    // parkingSpots is an array of parking spot IDs assigned to this unit
    data.parkingAssignments[unitId] = {
      parkingSpots: parkingSpots, // Array of parking IDs like ["a1", "b2"]
      assignedAt: new Date().toISOString(),
    }

    const success = writeProjectData(projectName, data)

    if (success) {
      res.json({
        success: true,
        message: `Cocheras asignadas a unidad ${unitId}`,
        data: data.parkingAssignments[unitId],
      })
    } else {
      res.status(500).json({
        success: false,
        message: "Error al guardar las cocheras",
      })
    }
  } catch (error) {
    console.error("Error assigning parking:", error)
    res.status(500).json({
      success: false,
      message: "Error al asignar cocheras",
    })
  }
}

exports.removeParking = async (req, res) => {
  try {
    const { projectName, unitId } = req.params

    if (!VALID_PROJECTS.includes(projectName)) {
      return res.status(400).json({
        success: false,
        message: `Invalid project name. Valid projects: ${VALID_PROJECTS.join(", ")}`,
      })
    }

    const data = readProjectData(projectName)

    if (data.parkingAssignments[unitId]) {
      delete data.parkingAssignments[unitId]
      writeProjectData(projectName, data)
    }

    res.json({
      success: true,
      message: `Cocheras eliminadas de unidad ${unitId}`,
    })
  } catch (error) {
    console.error("Error removing parking:", error)
    res.status(500).json({
      success: false,
      message: "Error al eliminar cocheras",
    })
  }
}

exports.removeParkingSpot = async (req, res) => {
  try {
    const { projectName, unitId, parkingId } = req.params

    if (!VALID_PROJECTS.includes(projectName)) {
      return res.status(400).json({
        success: false,
        message: `Invalid project name. Valid projects: ${VALID_PROJECTS.join(", ")}`,
      })
    }

    const data = readProjectData(projectName)

    if (data.parkingAssignments[unitId]) {
      const currentSpots = data.parkingAssignments[unitId].parkingSpots || []
      data.parkingAssignments[unitId].parkingSpots = currentSpots.filter((id) => id !== parkingId)

      // If no more parking spots, remove the assignment entirely
      if (data.parkingAssignments[unitId].parkingSpots.length === 0) {
        delete data.parkingAssignments[unitId]
      }

      writeProjectData(projectName, data)
    }

    res.json({
      success: true,
      message: `Cochera ${parkingId} eliminada de unidad ${unitId}`,
    })
  } catch (error) {
    console.error("Error removing parking spot:", error)
    res.status(500).json({
      success: false,
      message: "Error al eliminar cochera",
    })
  }
}

// GET /api/project-data - Get list of all projects with summary
exports.getAllProjects = async (req, res) => {
  try {
    const projectsSummary = VALID_PROJECTS.map((projectName) => {
      const data = readProjectData(projectName)
      return {
        project: projectName,
        totalOwners: Object.keys(data.owners).length,
        totalStatuses: Object.keys(data.statuses).length,
        totalParkingAssignments: Object.keys(data.parkingAssignments || {}).length,
        updatedAt: data.updatedAt,
      }
    })

    res.json({
      success: true,
      data: projectsSummary,
    })
  } catch (error) {
    console.error("Error getting all projects:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener lista de proyectos",
    })
  }
}
