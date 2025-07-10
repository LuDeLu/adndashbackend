require("dotenv").config()

const PORT = process.env.PORT || 3001

async function startServer() {
  try {
    // Inicializar la aplicación (esto incluye la inicialización de la DB)
    const initializeApp = require("./src/app") // Corregido: agregué ./src/
    const app = await initializeApp()

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`)
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`)
    })

    // Manejo de errores no capturados
    process.on("uncaughtException", (error) => {
      console.error("Uncaught Exception:", error)
      process.exit(1)
    })

    process.on("unhandledRejection", (reason, promise) => {
      console.error("Unhandled Rejection at:", promise, "reason:", reason)
    })

    // Manejo de cierre del servidor
    process.on("SIGTERM", () => {
      console.info("SIGTERM signal received.")
      console.log("Closing HTTP server.")
      server.close(() => {
        console.log("HTTP server closed.")
        process.exit(0)
      })
    })
  } catch (error) {
    console.error("❌ Failed to start server:", error)
    process.exit(1)
  }
}

startServer()
