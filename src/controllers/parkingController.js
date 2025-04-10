const parkingService = require("../services/parkingService")
const asyncHandler = require("../utils/asyncHandler")

const parkingController = {
  getParkingSpotsByProjectId: asyncHandler(async (req, res) => {
    try {
      const { projectId } = req.params
      const parkingSpots = await parkingService.getParkingSpotsByProjectId(projectId)
      res.json(parkingSpots)
    } catch (error) {
      console.error("Error in getParkingSpotsByProjectId controller:", error)
      res.status(500).json({ message: "Error al obtener las cocheras", error: error.message })
    }
  }),

  updateParkingSpot: asyncHandler(async (req, res) => {
    try {
      const { spotId } = req.params
      const { status, assigned_to } = req.body

      // Get the parking spot to check current status
      const spot = await parkingService.getParkingSpotById(spotId)

      if (!spot) {
        return res.status(404).json({ message: "Cochera no encontrada" })
      }

      // Update parking spot
      const updatedSpot = await parkingService.updateParkingSpot(spotId, {
        status,
        assigned_to,
        userId: req.user.userId,
        userName: req.user.nombre,
        projectId: spot.project_id,
        parkingId: spot.parking_id,
      })

      res.json(updatedSpot)
    } catch (error) {
      console.error("Error in updateParkingSpot controller:", error)
      res.status(500).json({ message: "Error al actualizar la cochera", error: error.message })
    }
  }),

  assignMultipleParkingSpots: asyncHandler(async (req, res) => {
    try {
      const { projectId } = req.params
      const { apartmentId, parkingIds } = req.body

      if (!apartmentId || !parkingIds || !Array.isArray(parkingIds)) {
        return res.status(400).json({ message: "Datos inválidos" })
      }

      await parkingService.assignMultipleParkingSpots(
        projectId,
        apartmentId,
        parkingIds,
        req.user.userId,
        req.user.nombre,
      )

      res.json({ message: "Cocheras asignadas exitosamente" })
    } catch (error) {
      console.error("Error in assignMultipleParkingSpots controller:", error)
      res.status(500).json({ message: "Error al asignar cocheras", error: error.message })
    }
  }),
}

module.exports = parkingController
