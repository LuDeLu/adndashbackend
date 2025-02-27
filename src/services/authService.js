const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const db = require("../config/database")

class AuthService {
  async login(email, password) {
    try {
      console.log("AuthService: Intentando login para:", email)
      const [users] = await db.execute("SELECT * FROM users2 WHERE email = ?", [email])
      console.log("AuthService: Usuarios encontrados:", users.length)

      if (users.length === 0) {
        console.log("AuthService: Usuario no encontrado:", email)
        throw new Error("Invalid credentials")
      }

      const user = users[0]

      const isMatch = await bcrypt.compare(password, user.password)
      console.log("AuthService: Comparación de contraseña:", isMatch)

      if (!isMatch) {
        console.log("AuthService: Contraseña incorrecta para usuario:", email)
        throw new Error("Invalid credentials")
      }

      console.log("AuthService: Login exitoso para:", email)
      const token = jwt.sign({ userId: user.id, email: user.email, rol: user.rol }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      })

      return { token, user: { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol } }
    } catch (error) {
      console.error("AuthService login error:", error)
      throw error
    }
  }

  async register(email, password, nombre, apellido) {
    try {
      const [existingUsers] = await db.query("SELECT * FROM users2 WHERE email = ?", [email])

      if (existingUsers.length > 0) {
        throw new Error("User already exists")
      }

      const hashedPassword = await bcrypt.hash(password, 10)

      const [result] = await db.query(
        "INSERT INTO users2 (email, password, nombre, apellido, rol) VALUES (?, ?, ?, ?, ?)",
        [email, hashedPassword, nombre, apellido, "user"],
      )

      const token = jwt.sign({ userId: result.insertId, email, rol: "user" }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      })

      return {
        token,
        user: { id: result.insertId, email, nombre, rol: "user" },
      }
    } catch (error) {
      console.error("Registration error:", error)
      throw error
    }
  }
}

module.exports = new AuthService()

