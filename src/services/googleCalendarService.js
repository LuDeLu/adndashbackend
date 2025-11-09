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

    return this.oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent",
      state: userId.toString(),
    })
  }

  // Intercambia el código de autorización por tokens de acceso y refresco
  async exchangeCodeForTokens(userId, code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code)
      const pool = await getPool()

      await pool.query(
        "UPDATE users SET google_access_token = ?, google_refresh_token = ?, google_connected = TRUE WHERE id = ?",
        [tokens.access_token, tokens.refresh_token, userId],
      )

      return tokens
    } catch (error) {
      console.error("Error exchanging code for tokens:", error)
      throw new Error("Failed to exchange authorization code")
    }
  }

  // Verifica si el usuario tiene una conexión activa con Google Calendar
  async isUserConnected(userId) {
    try {
      const pool = await getPool()
      const [rows] = await pool.query("SELECT google_connected FROM users WHERE id = ?", [userId])
      return rows.length > 0 && rows[0].google_connected === 1
    } catch (error) {
      console.error("Error checking Google connection:", error)
      return false
    }
  }

  // Configura las credenciales para el usuario en Google Calendar
  async setCredentialsForUser(userId) {
    const pool = await getPool()
    const [rows] = await pool.query("SELECT google_access_token, google_refresh_token FROM users WHERE id = ?", [
      userId,
    ])

    if (rows.length === 0 || !rows[0].google_access_token || !rows[0].google_refresh_token) {
      throw new Error("User not found or Google Calendar not connected")
    }

    const { google_access_token, google_refresh_token } = rows[0]
    this.oauth2Client.setCredentials({
      access_token: google_access_token,
      refresh_token: google_refresh_token,
    })

    // Actualiza automáticamente los tokens cuando se refrescan
    this.oauth2Client.on("tokens", async (tokens) => {
      if (tokens.access_token) {
        await pool.query("UPDATE users SET google_access_token = ? WHERE id = ?", [tokens.access_token, userId])
      }
    })

    return true
  }

  // Lista los eventos del calendario del usuario
  async listEvents(userId, options = {}) {
    await this.setCredentialsForUser(userId)

    const params = {
      calendarId: options.calendarId || "primary",
      timeMin: options.timeMin || new Date().toISOString(),
      timeMax: options.timeMax,
      maxResults: options.maxResults || 100,
      singleEvents: true,
      orderBy: "startTime",
    }

    try {
      const response = await this.calendar.events.list(params)
      return response.data.items || []
    } catch (error) {
      console.error("Error listing events:", error)
      if (error.response?.status === 401) {
        await this.handleAuthError(userId, error)
      }
      throw error
    }
  }

  // Añade un evento al calendario del usuario
  async addEvent(userId, event, calendarId = "primary") {
    await this.setCredentialsForUser(userId)

    try {
      const response = await this.calendar.events.insert({
        calendarId,
        resource: event,
      })
      return response.data
    } catch (error) {
      console.error("Error adding event:", error)
      if (error.response?.status === 401) {
        await this.handleAuthError(userId, error)
      }
      throw new Error(`Google Calendar API error: ${error.message}`)
    }
  }

  // Actualiza un evento en el calendario del usuario
  async updateEvent(userId, eventId, event, calendarId = "primary") {
    await this.setCredentialsForUser(userId)

    try {
      const response = await this.calendar.events.update({
        calendarId,
        eventId,
        resource: event,
      })
      return response.data
    } catch (error) {
      console.error("Error updating event:", error)
      if (error.response?.status === 401) {
        await this.handleAuthError(userId, error)
      }
      throw error
    }
  }

  // Elimina un evento del calendario del usuario
  async deleteEvent(userId, eventId, calendarId = "primary") {
    await this.setCredentialsForUser(userId)

    try {
      await this.calendar.events.delete({
        calendarId,
        eventId,
      })
      return true
    } catch (error) {
      if (error.response?.status === 404) {
        return true
      }

      console.error("Error deleting event:", error)
      if (error.response?.status === 401) {
        await this.handleAuthError(userId, error)
      }
      throw error
    }
  }

  // Maneja errores de autenticación, marcando la conexión como inválida
  async handleAuthError(userId, error) {
    if (error.response?.status === 401) {
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
      return response.data.items || []
    } catch (error) {
      console.error("Error listing calendars:", error)
      if (error.response?.status === 401) {
        await this.handleAuthError(userId, error)
      }
      throw error
    }
  }
}

module.exports = new GoogleCalendarService()
