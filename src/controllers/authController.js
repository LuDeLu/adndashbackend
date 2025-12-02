const authService = require("../services/authService")

const login = async (req, res) => {
  try {
    const { email, password } = req.body
    console.log(`Controller: Intento de login para email: ${email}`)

    const result = await authService.login(email, password)
    console.log(`Controller: Login exitoso para: ${email}`)

    res.json(result)
  } catch (error) {
    console.error(`Controller: Error en login:`, error)

    res.status(401).json({
      message: "Invalid credentials",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

const googleLogin = async (req, res) => {
  try {
    const { email, name, googleId } = req.body
    console.log(`Controller: Intento de Google login para: ${email}`)

    const result = await authService.googleLogin(email, name, googleId)
    console.log(`Controller: Google login exitoso para: ${email}`)

    res.json(result)
  } catch (error) {
    console.error(`Controller: Error en Google login:`, error)

    res.status(401).json({
      message: "Authentication failed",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token required" })
    }

    const result = await authService.refreshToken(refreshToken)
    console.log(`Controller: Token refrescado exitosamente`)

    res.json(result)
  } catch (error) {
    console.error(`Controller: Error al refrescar token:`, error)

    res.status(401).json({
      message: "Invalid refresh token",
      expired: true,
    })
  }
}

const validateToken = async (req, res) => {
  try {
    const authHeader = req.headers["authorization"]
    const token = authHeader && authHeader.split(" ")[1]

    if (!token) {
      return res.status(401).json({ valid: false, message: "No token provided" })
    }

    const result = await authService.validateToken(token)

    if (result.valid) {
      res.json(result)
    } else {
      res.status(401).json(result)
    }
  } catch (error) {
    console.error(`Controller: Error al validar token:`, error)
    res.status(401).json({ valid: false, message: "Token validation failed" })
  }
}

module.exports = {
  login,
  googleLogin,
  refreshToken,
  validateToken,
}
