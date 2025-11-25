const jwt = require("jsonwebtoken")
const { JWT_SECRET } = require("../config/auth")

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json({ error: "Authentication required" })
  }

  try {
    const user = jwt.verify(token, JWT_SECRET)
    req.user = user
    next()
  } catch (error) {
    console.error("Error de autenticación:", error.message)
    return res.status(403).json({ error: "Invalid or expired token" })
  }
}

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ error: "Access denied" })
    }
    next()
  }
}

module.exports = {
  authenticateToken,
  authorizeRoles,
}
