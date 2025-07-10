const express = require("express")
const router = express.Router()
const { authenticateToken } = require("../middleware/auth")
const apartmentController = require("../controllers/apartmentController")

// Get all apartments for a floor
router.get("/floor/:floorId", authenticateToken, apartmentController.getApartmentsByFloorId)

// Update apartment status
router.put("/:apartmentId", authenticateToken, apartmentController.updateApartmentStatus)

// Assign parking spots to an apartment
router.post("/:apartmentId/assign-parking", authenticateToken, apartmentController.assignParkingToApartment)

module.exports = router
