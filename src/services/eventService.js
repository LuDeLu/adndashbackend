const { getPool } = require("../config/database")
const googleCalendarService = require("./googleCalendarService")

class EventService {
  async getAllEvents(userId) {
    const pool = await getPool()
    const [rows] = await pool.query(
      `SELECT e.*, CONCAT(c.nombre, ' ', c.apellido) as clientName
       FROM events e
       LEFT JOIN clientes c ON e.client = c.id
       WHERE e.user_id = ? 
       ORDER BY e.start ASC`,
      [userId],
    )
    return rows
  }

  async createEvent(userId, eventData) {
    const pool = await getPool()
    const { title, client, start, end, description, location } = eventData

    let googleEventId = null

    try {
      const isConnected = await googleCalendarService.isUserConnected(userId)

      if (isConnected) {
        const googleEvent = await googleCalendarService.addEvent(userId, {
          summary: title,
          description: description ? `Cliente: ${client}\n\n${description}` : `Cliente: ${client}`,
          location: location || "",
          start: { dateTime: new Date(start).toISOString() },
          end: { dateTime: new Date(end).toISOString() },
        })
        googleEventId = googleEvent.id
      }
    } catch (error) {
      console.error("Google Calendar sync failed on create:", error)
      // Continue with local creation
    }

    const [result] = await pool.query(
      "INSERT INTO events (user_id, title, client, start, end, description, location, google_event_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [userId, title, client, new Date(start), new Date(end), description || null, location || null, googleEventId],
    )

    const [newEvent] = await pool.query("SELECT * FROM events WHERE id = ?", [result.insertId])
    return newEvent[0]
  }

  async updateEvent(userId, eventId, eventData) {
    const pool = await getPool()
    const { title, client, start, end, completed, reminded, description, location } = eventData

    const [currentEvent] = await pool.query("SELECT * FROM events WHERE id = ? AND user_id = ?", [eventId, userId])

    if (currentEvent.length === 0) {
      throw new Error("Event not found")
    }

    const googleEventId = currentEvent[0].google_event_id

    if (googleEventId) {
      try {
        const isConnected = await googleCalendarService.isUserConnected(userId)

        if (isConnected) {
          await googleCalendarService.updateEvent(userId, googleEventId, {
            summary: title,
            description: description ? `Cliente: ${client}\n\n${description}` : `Cliente: ${client}`,
            location: location || "",
            start: { dateTime: new Date(start).toISOString() },
            end: { dateTime: new Date(end).toISOString() },
          })
        }
      } catch (error) {
        console.error("Google Calendar sync failed on update:", error)
        // Continue with local update
      }
    }

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

    const [updatedEvent] = await pool.query("SELECT * FROM events WHERE id = ?", [eventId])
    return updatedEvent[0]
  }

  async deleteEvent(userId, eventId) {
    const pool = await getPool()

    const [event] = await pool.query("SELECT google_event_id FROM events WHERE id = ? AND user_id = ?", [
      eventId,
      userId,
    ])

    if (event.length === 0) {
      throw new Error("Event not found")
    }

    if (event[0].google_event_id) {
      try {
        const isConnected = await googleCalendarService.isUserConnected(userId)

        if (isConnected) {
          await googleCalendarService.deleteEvent(userId, event[0].google_event_id)
        }
      } catch (error) {
        console.error("Google Calendar sync failed on delete:", error)
        // Continue with local deletion
      }
    }

    await pool.query("DELETE FROM events WHERE id = ? AND user_id = ?", [eventId, userId])
    return true
  }

  async syncWithGoogleCalendar(userId) {
    const pool = await getPool()
    const stats = { imported: 0, updated: 0, errors: 0 }

    const isConnected = await googleCalendarService.isUserConnected(userId)
    if (!isConnected) {
      throw new Error("Google Calendar not connected")
    }

    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    const sixMonthsAhead = new Date()
    sixMonthsAhead.setMonth(sixMonthsAhead.getMonth() + 6)

    const googleEvents = await googleCalendarService.listEvents(userId, {
      timeMin: threeMonthsAgo.toISOString(),
      timeMax: sixMonthsAhead.toISOString(),
      maxResults: 500,
    })

    const [localEvents] = await pool.query("SELECT * FROM events WHERE user_id = ? AND google_event_id IS NOT NULL", [
      userId,
    ])

    const localEventsByGoogleId = {}
    localEvents.forEach((event) => {
      if (event.google_event_id) {
        localEventsByGoogleId[event.google_event_id] = event
      }
    })

    for (const googleEvent of googleEvents) {
      try {
        let client = ""
        let description = googleEvent.description || ""

        if (description.includes("Cliente:")) {
          const parts = description.split("Cliente:")
          if (parts.length > 1) {
            const clientLine = parts[1].trim().split("\n")[0]
            client = clientLine
            description = parts[1].substring(clientLine.length).trim()
          }
        }

        const eventData = {
          title: googleEvent.summary || "Sin título",
          client: client || "Sin cliente",
          start: new Date(googleEvent.start.dateTime || googleEvent.start.date),
          end: new Date(googleEvent.end.dateTime || googleEvent.end.date),
          description: description || null,
          location: googleEvent.location || null,
        }

        if (localEventsByGoogleId[googleEvent.id]) {
          const localEvent = localEventsByGoogleId[googleEvent.id]
          await pool.query(
            "UPDATE events SET title = ?, client = ?, start = ?, end = ?, description = ?, location = ? WHERE id = ?",
            [
              eventData.title,
              eventData.client,
              eventData.start,
              eventData.end,
              eventData.description,
              eventData.location,
              localEvent.id,
            ],
          )
          stats.updated++
        } else {
          await pool.query(
            "INSERT INTO events (user_id, title, client, start, end, description, location, google_event_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [
              userId,
              eventData.title,
              eventData.client,
              eventData.start,
              eventData.end,
              eventData.description,
              eventData.location,
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
  }

  async getEventsByDateRange(userId, startDate, endDate) {
    const pool = await getPool()
    const [rows] = await pool.query(
      `SELECT e.*, CONCAT(c.nombre, ' ', c.apellido) as clientName
       FROM events e
       LEFT JOIN clientes c ON e.client = c.id
       WHERE e.user_id = ? AND e.start >= ? AND e.end <= ? 
       ORDER BY e.start ASC`,
      [userId, new Date(startDate), new Date(endDate)],
    )
    return rows
  }

  async getPendingEvents(userId) {
    const pool = await getPool()
    const [rows] = await pool.query(
      `SELECT e.*, CONCAT(c.nombre, ' ', c.apellido) as clientName
       FROM events e
       LEFT JOIN clientes c ON e.client = c.id
       WHERE e.user_id = ? AND e.completed = FALSE AND e.start >= NOW() 
       ORDER BY e.start ASC`,
      [userId],
    )
    return rows
  }

  async getCompletedEvents(userId) {
    const pool = await getPool()
    const [rows] = await pool.query(
      `SELECT e.*, CONCAT(c.nombre, ' ', c.apellido) as clientName
       FROM events e
       LEFT JOIN clientes c ON e.client = c.id
       WHERE e.user_id = ? AND e.completed = TRUE 
       ORDER BY e.start DESC`,
      [userId],
    )
    return rows
  }
}

module.exports = new EventService()
