require("dotenv").config()
const express = require("express")
const cors = require("cors")
const { initializePool } = require("../src/config/database") // Esta ruta debería ser correcta

const app = express()

const allowedOrigins = ["https://adndash.vercel.app", "http://localhost:3000", "https://www.adncrm.com.ar"]

// Configuración de CORS mejorada
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true)
      } else {
        callback(new Error("Not allowed by CORS"))
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    optionsSuccessStatus: 204,
  }),
)

// Configuración de encabezados de seguridad
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none")
  res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none")
  res.setHeader("Access-Control-Allow-Credentials", "true")

  const origin = req.headers.origin
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin)
  }

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
    return res.status(204).end()
  }

  next()
})

app.use(express.json({ limit: "4gb" }))
app.use(express.urlencoded({ extended: true, limit: "4gb" }))

// Función para inicializar la aplicación
async function initializeApp() {
  try {
    // Inicializar el pool de la base de datos PRIMERO
    await initializePool()
    console.log("✅ Database pool initialized successfully")

    // Configuración de la aplicación después de la inicialización de la DB
    const { setupApplication } = require("./server-setup")
    const { uploadsDir } = setupApplication()
    app.use("/uploads", express.static(uploadsDir))

    // Importar rutas DESPUÉS de que la DB esté inicializada
    const clienteRoutes = require("./routes/clienteRoutes")
    const authRoutes = require("./routes/authRoutes")
    const eventRoutes = require("./routes/eventRoutes")
    const userRoutes = require("./routes/userRoutes")
    const agenciaRoutes = require("./routes/agenciaRoutes")
    const projectRoutes = require("./routes/projectRoutes")
    const postVentaRoutes = require("./routes/postVentaRoutes")
    const notificationRoutes = require("./routes/notificationRoutes")
    const checklistRoutes = require("./routes/checklistRoutes")
    const floorRoutes = require("./routes/floorRoutes")
    const apartmentRoutes = require("./routes/apartmentRoutes")
    const parkingRoutes = require("./routes/parkingRoutes")
    const activityLogRoutes = require("./routes/activityLogRoutes")
    const projectDataRoutes = require("./routes/projectDataRoutes")

    // Configurar rutas
    app.use("/api/clientes", clienteRoutes)
    app.use("/api/auth", authRoutes)
    app.use("/api/events", eventRoutes)
    app.use("/api/users", userRoutes)
    app.use("/api/agencias", agenciaRoutes)
    app.use("/api/projects", projectRoutes)
    app.use("/api/postventa", postVentaRoutes)
    app.use("/api/notifications", notificationRoutes)
    app.use("/api/checklist", checklistRoutes)
    app.use("/api/floors", floorRoutes)
    app.use("/api/apartments", apartmentRoutes)
    app.use("/api/parking", parkingRoutes)
    app.use("/api/activity-logs", activityLogRoutes)
    app.use("/api/project-data", projectDataRoutes)

    // Health check endpoint
    app.get("/api/health", (req, res) => {
      res.status(200).json({ status: "ok", message: "API is running" })
    })

    // Middleware de manejo de errores
    app.use((err, req, res, next) => {
      console.error("Error en el servidor:", err)
      res.status(err.status || 500).json({
        message: err.message || "Ha ocurrido un error en el servidor",
        error: process.env.NODE_ENV === "production" ? {} : err.stack,
      })
    })

    console.log("✅ Middleware y rutas configurados correctamente")
    return app
  } catch (error) {
    console.error("❌ Error al inicializar la aplicación:", error)
    throw error
  }
}

// Exportar la función de inicialización en lugar del app directamente
module.exports = initializeApp
