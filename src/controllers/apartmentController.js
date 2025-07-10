const apartmentService = require("../services/apartmentService")
const asyncHandler = require("../utils/asyncHandler")

const { getPool } = require("../config/database") // Import getPool from db.js

const apartmentController = {
  getApartmentsByFloorId: asyncHandler(async (req, res) => {
    try {
      const { floorId } = req.params
      const apartments = await apartmentService.getApartmentsByFloorId(floorId)
      res.json(apartments)
    } catch (error) {
      console.error("Error in getApartmentsByFloorId controller:", error)
      res.status(500).json({ message: "Error al obtener los departamentos", error: error.message })
    }
  }),

  updateApartmentStatus: asyncHandler(async (req, res) => {
    try {
      const { apartmentId } = req.params
      const { status, buyer, phone, email, price, description } = req.body

      // Get the apartment to check current status
      const apartment = await apartmentService.getApartmentById(apartmentId)

      if (!apartment) {
        return res.status(404).json({ message: "Departamento no encontrado" })
      }

      // Get floor and project info for logging
      const [floorResult] = await getPool().query(
        "SELECT f.id, f.project_id, f.floor_number FROM floors f WHERE f.id = ?",
        [apartment.floor_id],
      )

      if (floorResult.length === 0) {
        return res.status(404).json({ message: "Piso no encontrado" })
      }

      const floor = floorResult[0]

      // Update apartment
      const updatedApartment = await apartmentService.updateApartment(apartmentId, {
        status,
        buyer,
        phone,
        email,
        price,
        userId: req.user.userId,
        userName: req.user.nombre,
        projectId: floor.project_id,
        apartmentId: `${floor.floor_number}-${apartment.apartment_id}`, // apartment.apartment_id is the identifier like "1A"
        description,
      })

      res.json(updatedApartment)
    } catch (error) {
      console.error("Error in updateApartmentStatus controller:", error)
      res.status(500).json({ message: "Error al actualizar el estado del departamento", error: error.message })
    }
  }),

  getApartmentByIdentifier: asyncHandler(async (req, res) => {
    try {
      const { floorNumber, apartmentId } = req.params // apartmentId here is the identifier like "1A"
      const pool = getPool()
      const projectId = req.query.projectId || req.body.projectId

      if (!projectId) {
        return res.status(400).json({ message: "projectId es requerido" })
      }

      // First get the floor ID
      const [floorRows] = await pool.query("SELECT id FROM floors WHERE project_id = ? AND floor_number = ?", [
        projectId,
        floorNumber,
      ])

      if (floorRows.length === 0) {
        return res.status(404).json({ message: "Piso no encontrado" })
      }

      const floorId = floorRows[0].id

      // Then get the apartment
      const [apartmentRows] = await pool.query("SELECT * FROM apartments WHERE floor_id = ? AND apartment_id = ?", [
        floorId,
        apartmentId, // apartment_id is the identifier like "1A"
      ])

      if (apartmentRows.length === 0) {
        return res.status(404).json({ message: "Departamento no encontrado" })
      }

      res.json(apartmentRows[0])
    } catch (error) {
      console.error("Error in getApartmentByIdentifier controller:", error)
      res.status(500).json({ message: "Error al obtener el departamento", error: error.message })
    }
  }),

  assignParkingToApartment: asyncHandler(async (req, res) => {
    try {
      const { apartmentId } = req.params
      const { parking_spot_codes, projectId, description } = req.body
      const userId = req.user?.userId
      const userName = req.user?.nombre

      if (!Array.isArray(parking_spot_codes)) {
        return res.status(400).json({ message: "parking_spot_codes debe ser un array." })
      }
      if (!projectId) {
        return res.status(400).json({ message: "projectId es requerido." })
      }
      if (!userId || !userName) {
        return res.status(400).json({ message: "Información de usuario requerida." })
      }

      const result = await apartmentService.assignParkingToApartment(
        Number.parseInt(apartmentId, 10),
        parking_spot_codes,
        userId,
        userName,
        Number.parseInt(projectId, 10),
        description,
      )

      res.json(result)
    } catch (error) {
      console.error("Error in assignParkingToApartment controller:", error)
      res.status(500).json({ message: "Error al asignar cocheras", error: error.message })
    }
  }),
}

module.exports = apartmentController
