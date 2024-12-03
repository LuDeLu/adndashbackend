const { getPool } = require('../config/database');

class EventService {
  async getAllEvents(userId) {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM events WHERE user_id = ?', [userId]);
    return rows;
  }

  async createEvent(userId, eventData) {
    const pool = getPool();
    const { title, client, start, end, googleEventId } = eventData;
    const [result] = await pool.query(
      'INSERT INTO events (user_id, title, client, start, end, google_event_id) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, title, client, new Date(start), new Date(end), googleEventId]
    );
    return result.insertId;
  }

  async updateEvent(userId, eventId, eventData) {
    const pool = getPool();
    const { title, client, start, end, completed, reminded, googleEventId } = eventData;
    await pool.query(
      'UPDATE events SET title = ?, client = ?, start = ?, end = ?, completed = ?, reminded = ?, google_event_id = ? WHERE id = ? AND user_id = ?',
      [title, client, new Date(start), new Date(end), completed, reminded, googleEventId, eventId, userId]
    );
  }

  async deleteEvent(userId, eventId) {
    const pool = getPool();
    await pool.query('DELETE FROM events WHERE id = ? AND user_id = ?', [eventId, userId]);
  }
}

module.exports = new EventService();
