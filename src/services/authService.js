const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const { getPool } = require("../config/database")
const { JWT_SECRET } = require("../config/auth")

const ACCESS_TOKEN_EXPIRY = "8h" // Token de acceso dura 8 horas
const REFRESH_TOKEN_EXPIRY = "7d" // Refresh token dura 7 días

class AuthService {
  async login(email, password) {
    console.log(`Service: Intento de login para email: ${email}`)

    const pool = getPool()
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email])

    if (rows.length === 0) {
      console.log(`Service: Usuario no encontrado para email: ${email}`)
      throw new Error("User not found")
    }

    const user = rows[0]
    console.log(`Service: Usuario encontrado: ID=${user.id}, Rol=${user.rol}`)

    // Si el usuario no tiene contraseña (solo login con Google)
    if (!user.password) {
      console.log(`Service: Usuario sin contraseña (solo Google login)`)
      throw new Error("No password set for this user")
    }

    // Verificación simple sin bcrypt para depuración
    if (password === user.password) {
      console.log(`Service: Contraseña en texto plano verificada correctamente`)
      const tokens = this.generateTokens(user)
      return { ...tokens, user: this.sanitizeUser(user) }
    }

    // Si la contraseña no coincide en texto plano, intentamos con bcrypt
    try {
      // Verificar si la contraseña parece estar hasheada con bcrypt
      if (user.password.startsWith("$2")) {
        const isValid = await bcrypt.compare(password, user.password)
        if (isValid) {
          console.log(`Service: Verificación bcrypt exitosa`)
          const tokens = this.generateTokens(user)
          return { ...tokens, user: this.sanitizeUser(user) }
        }
      }

      // Si llegamos aquí, la contraseña no es válida
      console.log(`Service: Contraseña inválida para usuario: ${user.id}`)
      throw new Error("Invalid password")
    } catch (error) {
      console.error(`Service: Error en verificación de contraseña:`, error)
      throw new Error("Password verification failed")
    }
  }

  async googleLogin(email, name, googleId) {
    console.log(`Service: Intento de Google login para email: ${email}`)

    const pool = getPool()
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ? OR google_id = ?", [email, googleId])

    let user
    if (rows.length === 0) {
      console.log(`Service: Creando nuevo usuario para Google login: ${email}`)
      try {
        const [result] = await pool.query(
          "INSERT INTO users (email, nombre, google_id, rol, rol_id) VALUES (?, ?, ?, ?, ?)",
          [email, name, googleId, "user", 3],
        )
        user = { id: result.insertId, email, nombre: name, rol: "user", rol_id: 3 }
      } catch (error) {
        console.error(`Service: Error al crear usuario:`, error)
        throw new Error("Failed to create user")
      }
    } else {
      user = rows[0]
      console.log(`Service: Usuario existente encontrado: ID=${user.id}, Rol=${user.rol}`)

      if (!user.google_id) {
        try {
          console.log(`Service: Actualizando googleId para usuario: ${user.id}`)
          await pool.query("UPDATE users SET google_id = ? WHERE id = ?", [googleId, user.id])
        } catch (error) {
          console.error(`Service: Error al actualizar googleId:`, error)
          // No lanzamos error aquí, continuamos con el login
        }
      }
    }

    console.log(`Service: Google login exitoso para usuario: ${user.id}`)
    const tokens = this.generateTokens(user)
    return { ...tokens, user: this.sanitizeUser(user) }
  }

  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, JWT_SECRET)

      // Verificar que el usuario aún existe
      const pool = getPool()
      const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [decoded.userId])

      if (rows.length === 0) {
        throw new Error("User not found")
      }

      const user = rows[0]

      // Generar nuevos tokens
      const tokens = this.generateTokens(user)
      console.log(`Service: Tokens refrescados para usuario: ${user.id}`)

      return { ...tokens, user: this.sanitizeUser(user) }
    } catch (error) {
      console.error(`Service: Error al refrescar token:`, error.message)
      throw new Error("Invalid refresh token")
    }
  }

  async validateToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET)

      // Verificar que el usuario aún existe
      const pool = getPool()
      const [rows] = await pool.query("SELECT id, email, nombre, rol FROM users WHERE id = ?", [decoded.userId])

      if (rows.length === 0) {
        throw new Error("User not found")
      }

      return { valid: true, user: this.sanitizeUser(rows[0]) }
    } catch (error) {
      return { valid: false, error: error.message }
    }
  }

  generateTokens(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      rol: user.rol,
    }

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY })
    const refreshToken = jwt.sign({ userId: user.id, type: "refresh" }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY })

    return { token, refreshToken }
  }

  // Mantener compatibilidad con código existente
  generateToken(user) {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        rol: user.rol,
      },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY },
    )
  }

  sanitizeUser(user) {
    const { id, email, nombre, rol } = user
    return { id, email, nombre, rol }
  }
}

module.exports = new AuthService()
