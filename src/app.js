require("dotenv").config()
const express = require("express")
const cors = require("cors")
const { initializePool } = require("./config/database")
const clienteRoutes = require("./routes/clienteRoutes")
const authRoutes = require("./routes/authRoutes")
const eventRoutes = require("./routes/eventRoutes")
const userRoutes = require("./routes/userRoutes")
const agenciaRoutes = require("./routes/agenciaRoutes")
const projectRoutes = require("./routes/projectRoutes")
const errorHandler = require("./middleware/errorHandler")
const { setupApplication } = require("./server-setup")
const postVentaRoutes = require("./routes/postVentaRoutes")
const notificationRoutes = require("./routes/notificationRoutes")
const checklistRoutes = require("./routes/checklistRoutes") // Añadimos las rutas de checklist
const floorRoutes = require("./routes/floorRoutes")
const apartmentRoutes = require("./routes/apartmentRoutes")
const parkingRoutes = require("./routes/parkingRoutes")

const app = express()

const allowedOrigins = ["https://adndash.vercel.app", "http://localhost:3000"]

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

// Configuración de la aplicación
const { uploadsDir } = setupApplication()
app.use("/uploads", express.static(uploadsDir))

// Rutas
app.use("/api/clientes", clienteRoutes)
app.use("/api/auth", authRoutes)
app.use("/api/events", eventRoutes)
app.use("/api/users", userRoutes)
app.use("/api/agencias", agenciaRoutes)
app.use("/api/projects", projectRoutes)
app.use("/api/postventa", postVentaRoutes)
app.use("/api/notifications", notificationRoutes)
app.use("/api/checklist", checklistRoutes) // Añadimos las rutas de checklist
app.use("/api/floors", floorRoutes)
app.use("/api/apartments", apartmentRoutes)
app.use("/api/parking", parkingRoutes)

// Add a health check endpoint to the app.js file

// Add this route near the other routes
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "API is running" })
})

// Middleware de manejo de errores mejorado
app.use((err, req, res, next) => {
  console.error("Error en el servidor:", err)
  res.status(err.status || 500).json({
    message: err.message || "Ha ocurrido un error en el servidor",
    error: process.env.NODE_ENV === "production" ? {} : err.stack,
  })
})

// Inicializar el pool de la base de datos
initializePool().catch((error) => {
  console.error("Error al inicializar el pool de la base de datos:", error)
  process.exit(1)
})

console.log("Middleware y rutas configurados")

module.exports = app
