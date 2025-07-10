const { getPool } = require("../config/database")
const googleCalendarService = require("./googleCalendarService")

class EventService {
  async getAllEvents(userId) {
    const pool = await getPool()
    const [rows] = await pool.query("SELECT * FROM events WHERE user_id = ? ORDER BY start ASC", [userId])
    return rows
  }

  async createEvent(userId, eventData) {
    const pool = await getPool()
    const { title, client, start, end, description, location } = eventData

    let googleEventId = null
    let googleError = null

    try {
      // Verificar si el usuario tiene conexión con Google Calendar
      const isConnected = await googleCalendarService.isUserConnected(userId)

      if (isConnected) {
        // Crear evento en Google Calendar
        const googleEvent = await googleCalendarService.addEvent(userId, {
          summary: title,
          description: `Cliente: ${client}${description ? "\n\n" + description : ""}`,
          location: location || "",
          start: { dateTime: new Date(start).toISOString() },
          end: { dateTime: new Date(end).toISOString() },
        })

        googleEventId = googleEvent.id
      }
    } catch (error) {
      console.error("Error creating event in Google Calendar:", error)
      googleError = error.message
      // Continuamos con la creación local del evento
    }

    // Crear evento en la base de datos local
    const [result] = await pool.query(
      "INSERT INTO events (user_id, title, client, start, end, description, location, google_event_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [userId, title, client, new Date(start), new Date(end), description || null, location || null, googleEventId],
    )

    const [newEvent] = await pool.query("SELECT * FROM events WHERE id = ?", [result.insertId])

    // Si hubo un error con Google Calendar pero el evento local se creó correctamente
    if (googleError) {
      const error = new Error(`Google Calendar sync failed: ${googleError}`)
      error.localEvent = newEvent[0]
      throw error
    }

    return newEvent[0]
  }

  async updateEvent(userId, eventId, eventData) {
    const pool = await getPool()
    const { title, client, start, end, completed, reminded, description, location } = eventData

    // Obtener el evento actual para verificar si tiene un ID de Google Calendar
    const [currentEvent] = await pool.query("SELECT * FROM events WHERE id = ? AND user_id = ?", [eventId, userId])

    if (currentEvent.length === 0) {
      throw new Error("Event not found")
    }

    const googleEventId = currentEvent[0].google_event_id
    let googleError = null

    // Actualizar en Google Calendar si hay un ID de Google
    if (googleEventId) {
      try {
        // Verificar si el usuario tiene conexión con Google Calendar
        const isConnected = await googleCalendarService.isUserConnected(userId)

        if (isConnected) {
          await googleCalendarService.updateEvent(userId, googleEventId, {
            summary: title,
            description: `Cliente: ${client}${description ? "\n\n" + description : ""}`,
            location: location || "",
            start: { dateTime: new Date(start).toISOString() },
            end: { dateTime: new Date(end).toISOString() },
          })
        }
      } catch (error) {
        console.error("Error updating event in Google Calendar:", error)
        googleError = error.message
        // Continuamos con la actualización local
      }
    }

    // Actualizar en la base de datos local
    await pool.query(
      "UPDATE events SET title = ?, client = ?, start = ?, end = ?, completed = ?, reminded = ?, description = ?, location = ? WHERE id = ? AND user_id = ?",
      [
        title,
        client,
        new Date(start),
        new Date(end),
        completed !== undefined ? completed : currentEvent[0].completed,
        reminded !== undefined ? reminded : currentEvent[0].reminded,
        description || null,
        location || null,
        eventId,
        userId,
      ],
    )

    // Obtener el evento actualizado
    const [updatedEvent] = await pool.query("SELECT * FROM events WHERE id = ?", [eventId])

    // Si hubo un error con Google Calendar pero el evento local se actualizó correctamente
    if (googleError) {
      const error = new Error(`Google Calendar sync failed: ${googleError}`)
      throw error
    }

    return updatedEvent[0]
  }

  async deleteEvent(userId, eventId) {
    const pool = await getPool()

    // Obtener el ID de Google Calendar del evento
    const [event] = await pool.query("SELECT google_event_id FROM events WHERE id = ? AND user_id = ?", [
      eventId,
      userId,
    ])

    if (event.length === 0) {
      throw new Error("Event not found")
    }

    let googleError = null

    // Eliminar de Google Calendar si hay un ID de Google
    if (event[0].google_event_id) {
      try {
        // Verificar si el usuario tiene conexión con Google Calendar
        const isConnected = await googleCalendarService.isUserConnected(userId)

        if (isConnected) {
          await googleCalendarService.deleteEvent(userId, event[0].google_event_id)
        }
      } catch (error) {
        console.error("Error deleting event from Google Calendar:", error)
        googleError = error.message
        // Continuamos con la eliminación local
      }
    }

    // Eliminar de la base de datos local
    await pool.query("DELETE FROM events WHERE id = ? AND user_id = ?", [eventId, userId])

    // Si hubo un error con Google Calendar pero el evento local se eliminó correctamente
    if (googleError) {
      throw new Error(`Google Calendar sync failed: ${googleError}`)
    }

    return true
  }

  async syncWithGoogleCalendar(userId) {
    const pool = await getPool()
    const stats = {
      imported: 0,
      updated: 0,
      errors: 0,
    }

    try {
      // Verificar si el usuario tiene conexión con Google Calendar
      const isConnected = await googleCalendarService.isUserConnected(userId)

      if (!isConnected) {
        throw new Error("Google Calendar not connected for this user")
      }

      // Obtener eventos de Google Calendar (últimos 3 meses y próximos 6 meses)
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

      const sixMonthsAhead = new Date()
      sixMonthsAhead.setMonth(sixMonthsAhead.getMonth() + 6)

      const googleEvents = await googleCalendarService.listEvents(userId, {
        timeMin: threeMonthsAgo.toISOString(),
        timeMax: sixMonthsAhead.toISOString(),
        maxResults: 500,
      })

      // Obtener eventos locales para comparación
      const [localEvents] = await pool.query("SELECT * FROM events WHERE user_id = ? AND google_event_id IS NOT NULL", [
        userId,
      ])

      const localEventsByGoogleId = {}
      localEvents.forEach((event) => {
        if (event.google_event_id) {
          localEventsByGoogleId[event.google_event_id] = event
        }
      })

      // Procesar eventos de Google Calendar
      for (const googleEvent of googleEvents) {
        try {
          // Extraer información del cliente del campo de descripción
          let client = ""
          if (googleEvent.description && googleEvent.description.includes("Cliente:")) {
            client = googleEvent.description.split("Cliente:")[1].trim().split("\n")[0]
          }

          // Verificar si el evento ya existe localmente
          if (localEventsByGoogleId[googleEvent.id]) {
            // Actualizar evento local con datos de Google
            const localEvent = localEventsByGoogleId[googleEvent.id]

            await pool.query(
              "UPDATE events SET title = ?, client = ?, start = ?, end = ?, description = ?, location = ? WHERE id = ?",
              [
                googleEvent.summary || "Sin título",
                client,
                new Date(googleEvent.start.dateTime || googleEvent.start.date),
                new Date(googleEvent.end.dateTime || googleEvent.end.date),
                googleEvent.description || null,
                googleEvent.location || null,
                localEvent.id,
              ],
            )

            stats.updated++
          } else {
            // Crear nuevo evento local
            await pool.query(
              "INSERT INTO events (user_id, title, client, start, end, description, location, google_event_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
              [
                userId,
                googleEvent.summary || "Sin título",
                client,
                new Date(googleEvent.start.dateTime || googleEvent.start.date),
                new Date(googleEvent.end.dateTime || googleEvent.end.date),
                googleEvent.description || null,
                googleEvent.location || null,
                googleEvent.id,
              ],
            )

            stats.imported++
          }
        } catch (error) {
          console.error(`Error processing Google event ${googleEvent.id}:`, error)
          stats.errors++
        }
      }

      return stats
    } catch (error) {
      console.error("Error syncing with Google Calendar:", error)
      throw error
    }
  }

  // Método para obtener eventos por rango de fechas
  async getEventsByDateRange(userId, startDate, endDate) {
    const pool = await getPool()
    const [rows] = await pool.query(
      "SELECT * FROM events WHERE user_id = ? AND start >= ? AND end <= ? ORDER BY start ASC",
      [userId, new Date(startDate), new Date(endDate)],
    )
    return rows
  }

  // Método para obtener eventos pendientes (no completados)
  async getPendingEvents(userId) {
    const pool = await getPool()
    const [rows] = await pool.query(
      "SELECT * FROM events WHERE user_id = ? AND completed = FALSE AND start >= NOW() ORDER BY start ASC",
      [userId],
    )
    return rows
  }

  // Método para obtener eventos completados
  async getCompletedEvents(userId) {
    const pool = await getPool()
    const [rows] = await pool.query("SELECT * FROM events WHERE user_id = ? AND completed = TRUE ORDER BY start DESC", [
      userId,
    ])
    return rows
  }
}

module.exports = new EventService()
