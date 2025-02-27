const express = require("express")
const router = express.Router()
const AuthController = require("../controllers/authController")

router.post("/login", async (req, res, next) => {
  console.log("Recibida solicitud de login:", req.body)
  try {
    await AuthController.login(req, res)
  } catch (error) {
    console.error("Error en la ruta de login:", error)
    next(error)
  }
})

router.post("/google-login", async (req, res, next) => {
  console.log("Recibida solicitud de Google login:", req.body)
  try {
    await AuthController.googleLogin(req, res)
  } catch (error) {
    console.error("Error en la ruta de Google login:", error)
    next(error)
  }
})

module.exports = router

