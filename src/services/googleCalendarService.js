const { google } = require("googleapis")
const { OAuth2 } = google.auth
const { getPool } = require("../config/database")

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI

class GoogleCalendarService {
  constructor() {
    this.oauth2Client = new OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
    this.calendar = google.calendar({ version: "v3", auth: this.oauth2Client })
  }

  // Genera la URL de autorización para el flujo OAuth2
  async getAuthUrl(userId) {
    const scopes = ["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.events"]

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent", // Asegura que siempre se obtenga un refresh_token
      state: userId.toString(), // Para identificar al usuario en el callback
    })

    return authUrl
  }

  // Intercambia el código de autorización por tokens de acceso y refresco
  async exchangeCodeForTokens(userId, code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code)

      // Guardar tokens en la base de datos
      const pool = await getPool()
      await pool.query(
        "UPDATE users SET google_access_token = ?, google_refresh_token = ?, google_connected = TRUE WHERE id = ?",
        [tokens.access_token, tokens.refresh_token, userId],
      )

      return true
    } catch (error) {
      console.error("Error exchanging code for tokens:", error)
      throw new Error(`Failed to exchange authorization code: ${error.message}`)
    }
  }

  // Verifica si el usuario tiene una conexión activa con Google Calendar
  async isUserConnected(userId) {
    try {
      const pool = await getPool()
      const [rows] = await pool.query("SELECT google_connected FROM users WHERE id = ?", [userId])

      if (rows.length === 0) {
        console.log(`User not found with ID: ${userId}`);
        return false;
      }

      return rows.length > 0 && rows[0].google_connected === 1
    } catch (error) {
      console.error("Error in isUserConnected:", error)
      throw new Error("Error checking Google connection: " + error.message)
    }
  }

  async setCredentialsForUser(userId) {
    const pool = await getPool()
    const [rows] = await pool.query("SELECT google_access_token, google_refresh_token FROM users WHERE id = ?", [
      userId,
    ])

    if (rows.length > 0 && rows[0].google_access_token && rows[0].google_refresh_token) {
      const { google_access_token, google_refresh_token } = rows[0]
      this.oauth2Client.setCredentials({
        access_token: google_access_token,
        refresh_token: google_refresh_token,
      })

      // Configurar el manejador de tokens actualizados
      this.oauth2Client.on("tokens", async (tokens) => {
        if (tokens.access_token) {
          // Actualizar el token de acceso en la base de datos
          const pool = await getPool()
          await pool.query("UPDATE users SET google_access_token = ? WHERE id = ?", [tokens.access_token, userId])
        }
      })

      return true
    } else {
      throw new Error("User not found or Google Calendar not connected")
    }
  }

  async listEvents(userId, options = {}) {
    await this.setCredentialsForUser(userId)

    const calendarId = options.calendarId || "primary"
    const maxResults = options.maxResults || 100
    const timeMin = options.timeMin || new Date().toISOString()
    const timeMax = options.timeMax || undefined

    try {
      const response = await this.calendar.events.list({
        calendarId: calendarId,
        timeMin: timeMin,
        timeMax: timeMax,
        maxResults: maxResults,
        singleEvents: true,
        orderBy: "startTime",
      })
      return response.data.items
    } catch (error) {
      console.error("Error listing events:", error)

      // Manejo específico de errores de autenticación
      if (error.response && error.response.status === 401) {
        await this.handleAuthError(userId, error)
      }

      throw error
    }
  }

  async addEvent(userId, event, calendarId = "primary") {
    try {
      await this.setCredentialsForUser(userId)
      const response = await this.calendar.events.insert({
        calendarId: calendarId,
        resource: event,
      })
      return response.data
    } catch (error) {
      console.error("Error adding event:", error)

      // Manejo específico de errores de autenticación
      if (error.response && error.response.status === 401) {
        await this.handleAuthError(userId, error)
      }

      throw new Error("Google Calendar API error: " + error.message)
    }
  }

  async updateEvent(userId, eventId, event, calendarId = "primary") {
    await this.setCredentialsForUser(userId)
    try {
      const response = await this.calendar.events.update({
        calendarId: calendarId,
        eventId: eventId,
        resource: event,
      })
      return response.data
    } catch (error) {
      console.error("Error updating event:", error)

      // Manejo específico de errores de autenticación
      if (error.response && error.response.status === 401) {
        await this.handleAuthError(userId, error)
      }

      throw error
    }
  }

  async deleteEvent(userId, eventId, calendarId = "primary") {
    await this.setCredentialsForUser(userId)
    try {
      await this.calendar.events.delete({
        calendarId: calendarId,
        eventId: eventId,
      })
      return true
    } catch (error) {
      console.error("Error deleting event:", error)

      // Manejo específico de errores de autenticación
      if (error.response && error.response.status === 401) {
        await this.handleAuthError(userId, error)
      }

      // Si el evento no existe en Google Calendar, consideramos que ya está eliminado
      if (error.response && error.response.status === 404) {
        return true
      }

      throw error
    }
  }

  // Maneja errores de autenticación, marcando la conexión como inválida
  async handleAuthError(userId, error) {
    if (error.response && error.response.status === 401) {
      const pool = await getPool()
      await pool.query("UPDATE users SET google_connected = FALSE WHERE id = ?", [userId])

      throw new Error("Google Calendar authentication expired. Please reconnect your account.")
    }
    throw error
  }

  // Obtiene información sobre los calendarios disponibles del usuario
  async listCalendars(userId) {
    await this.setCredentialsForUser(userId)
    try {
      const response = await this.calendar.calendarList.list()
      return response.data.items
    } catch (error) {
      console.error("Error listing calendars:", error)

      // Manejo específico de errores de autenticación
      if (error.response && error.response.status === 401) {
        await this.handleAuthError(userId, error)
      }

      throw error
    }
  }
}

module.exports = new GoogleCalendarService()