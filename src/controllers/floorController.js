const floorService = require("../services/floorService")
const apartmentService = require("../services/apartmentService")
const parkingService = require("../services/parkingService")
const asyncHandler = require("../utils/asyncHandler")
const { getPool } = require("../config/database") // Import getPool from db.js

const floorController = {
  getFloorsByProjectId: asyncHandler(async (req, res) => {
    try {
      const { projectId } = req.params
      const floors = await floorService.getFloorsByProjectId(projectId)
      res.json(floors)
    } catch (error) {
      console.error("Error in getFloorsByProjectId controller:", error)
      res.status(500).json({ message: "Error al obtener los pisos", error: error.message })
    }
  }),

  getFloorByProjectAndNumber: asyncHandler(async (req, res) => {
    try {
      const { projectId, floorNumber } = req.params
      const floor = await floorService.getFloorByProjectAndNumber(projectId, floorNumber)

      if (!floor) {
        return res.status(404).json({ message: "Piso no encontrado" })
      }

      res.json(floor)
    } catch (error) {
      console.error("Error in getFloorByProjectAndNumber controller:", error)
      res.status(500).json({ message: "Error al obtener el piso", error: error.message })
    }
  }),

  getFloorData: asyncHandler(async (req, res) => {
    try {
      const { projectId, floorNumber } = req.params

      // Get floor
      const floor = await floorService.getFloorByProjectAndNumber(projectId, floorNumber)

      if (!floor) {
        return res.status(404).json({ message: "Piso no encontrado" })
      }

      // Get apartments for this floor
      const apartments = await apartmentService.getApartmentsByFloorId(floor.id)

      // Format data to match the expected structure in the frontend
      const formattedData = {
        apartments: {},
        svgPaths: {},
        viewBox: floor.view_box,
      }

      // Format apartments
      apartments.forEach((apt) => {
        formattedData.apartments[apt.apartment_id] = {
          buyer: apt.buyer || "",
          date: apt.reservation_date || "",
          price: apt.price,
          status: apt.status,
          surface: apt.surface,
          phoneNumber: apt.phone || "",
          email: apt.email || "",
          assignedParkings: [],
        }

        formattedData.svgPaths[apt.apartment_id] = apt.svg_path
      })

      // Get assigned parking spots for apartments in this floor
      const [parkingAssignments] = await getPool().query(
        `SELECT ps.parking_id, ps.assigned_to 
         FROM parking_spots ps
         WHERE ps.project_id = ? AND ps.assigned_to IS NOT NULL`,
        [projectId],
      )

      // Add parking assignments to apartments
      parkingAssignments.forEach((assignment) => {
        if (assignment.assigned_to) {
          const [floorNum, aptId] = assignment.assigned_to.split("-")

          if (floorNum === floorNumber && formattedData.apartments[aptId]) {
            formattedData.apartments[aptId].assignedParkings.push(assignment.parking_id)
          }
        }
      })

      res.json(formattedData)
    } catch (error) {
      console.error("Error in getFloorData controller:", error)
      res.status(500).json({ message: "Error al obtener los datos del piso", error: error.message })
    }
  }),

  getActivityLogs: asyncHandler(async (req, res) => {
    try {
      const { projectId } = req.params
      const logs = await apartmentService.getActivityLogsByProjectId(projectId)
      res.json(logs)
    } catch (error) {
      console.error("Error in getActivityLogs controller:", error)
      res.status(500).json({ message: "Error al obtener el registro de actividades", error: error.message })
    }
  }),
}

module.exports = floorController
