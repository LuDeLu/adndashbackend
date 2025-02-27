const AuthService = require("../services/authService")

exports.login = async (req, res) => {
  try {
    console.log("Iniciando proceso de login para:", req.body.email)
    const { email, password } = req.body
    const result = await AuthService.login(email, password)
    console.log("Login exitoso para:", email)
    res.json(result)
  } catch (error) {
    console.error("Login controller error:", error)
    if (error.message === "Invalid credentials") {
      return res.status(401).json({ error: "Invalid email or password" })
    }
    res.status(500).json({ error: "An error occurred during login", details: error.message })
  }
}

exports.googleLogin = async (req, res) => {
  try {
    const { email, name, googleId } = req.body
    const result = await AuthService.googleLogin(email, name, googleId)
    res.json(result)
  } catch (error) {
    console.error("Google login controller error:", error)
    res.status(500).json({ error: "An error occurred during Google login" })
  }
}

exports.register = async (req, res) => {
  try {
    const { email, password, nombre, apellido } = req.body
    const result = await AuthService.register(email, password, nombre, apellido)
    res.json(result)
  } catch (error) {
    console.error("Registration controller error:", error)
    if (error.message === "User already exists") {
      return res.status(400).json({ error: "Email is already in use" })
    }
    res.status(500).json({ error: "An error occurred during registration" })
  }
}

