const { getPool } = require('../config/database');
const googleCalendarService = require('./googleCalendarService');

class EventService {
  async getAllEvents(userId) {
    const pool = await getPool();
    const [rows] = await pool.query('SELECT * FROM events WHERE user_id = ?', [userId]);
    return rows;
  }

  async createEvent(userId, eventData) {
    const pool = await getPool();
    const { title, client, start, end } = eventData;
    
    // Create event in Google Calendar
    const googleEvent = await googleCalendarService.addEvent(userId, {
      summary: title,
      description: `Client: ${client}`,
      start: { dateTime: new Date(start).toISOString() },
      end: { dateTime: new Date(end).toISOString() },
    });

    const [result] = await pool.query(
      'INSERT INTO events (user_id, title, client, start, end, google_event_id) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, title, client, new Date(start), new Date(end), googleEvent.id]
    );
    
    const [newEvent] = await pool.query('SELECT * FROM events WHERE id = ?', [result.insertId]);
    return newEvent[0];
  }

  async updateEvent(userId, eventId, eventData) {
    const pool = await getPool();
    const { title, client, start, end, completed, reminded, googleEventId } = eventData;
    
    // Update event in Google Calendar
    if (googleEventId) {
      await googleCalendarService.updateEvent(userId, googleEventId, {
        summary: title,
        description: `Client: ${client}`,
        start: { dateTime: start },
        end: { dateTime: end },
      });
    }

    await pool.query(
      'UPDATE events SET title = ?, client = ?, start = ?, end = ?, completed = ?, reminded = ?, google_event_id = ? WHERE id = ? AND user_id = ?',
      [title, client, new Date(start), new Date(end), completed, reminded, googleEventId, eventId, userId]
    );
  }

  async deleteEvent(userId, eventId) {
    const pool = await getPool();
    
    // Get the Google Calendar event ID
    const [event] = await pool.query('SELECT google_event_id FROM events WHERE id = ? AND user_id = ?', [eventId, userId]);
    
    if (event && event[0].google_event_id) {
      // Delete event from Google Calendar
      await googleCalendarService.deleteEvent(userId, event[0].google_event_id);
    }

    await pool.query('DELETE FROM events WHERE id = ? AND user_id = ?', [eventId, userId]);
  }

  async syncWithGoogleCalendar(userId) {
    const pool = await getPool();
    try {
      const googleEvents = await googleCalendarService.listEvents(userId);
      
      for (const event of googleEvents) {
        const [existingEvent] = await pool.query('SELECT * FROM events WHERE google_event_id = ?', [event.id]);
        
        if (existingEvent.length === 0) {
          await this.createEvent(userId, {
            title: event.summary,
            client: event.description ? event.description.replace('Client: ', '') : '',
            start: event.start.dateTime || event.start.date,
            end: event.end.dateTime || event.end.date,
            googleEventId: event.id,
          });
        }
      }
    } catch (error) {
      console.error('Error syncing with Google Calendar:', error);
      throw error;
    }
  }
}

module.exports = new EventService();

