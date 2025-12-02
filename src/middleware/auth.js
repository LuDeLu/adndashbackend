const jwt = require("jsonwebtoken")
const { JWT_SECRET } = require("../config/auth")

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json({ error: "Authentication required", code: "NO_TOKEN" })
  }

  try {
    const user = jwt.verify(token, JWT_SECRET)
    req.user = user
    next()
  } catch (error) {
    console.error("Error de autenticación:", error.message)

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Token expired",
        code: "TOKEN_EXPIRED",
        expiredAt: error.expiredAt,
      })
    }

    return res.status(403).json({ error: "Invalid token", code: "INVALID_TOKEN" })
  }
}

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ error: "Access denied", code: "FORBIDDEN" })
    }
    next()
  }
}

module.exports = {
  authenticateToken,
  authorizeRoles,
}
