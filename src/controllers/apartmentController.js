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
        apartmentId: `${floor.floor_number}-${apartment.apartment_id}`,
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
      const { floorNumber, apartmentId } = req.params
      const pool = getPool()

      // First get the floor ID
      const [floorRows] = await pool.query("SELECT id FROM floors WHERE project_id = ? AND floor_number = ?", [
        req.query.projectId || req.body.projectId,
        floorNumber,
      ])

      if (floorRows.length === 0) {
        return res.status(404).json({ message: "Piso no encontrado" })
      }

      const floorId = floorRows[0].id

      // Then get the apartment
      const [apartmentRows] = await pool.query("SELECT * FROM apartments WHERE floor_id = ? AND apartment_id = ?", [
        floorId,
        apartmentId,
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
}

module.exports = apartmentController
