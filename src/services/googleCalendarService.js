const { google } = require('googleapis');
const { OAuth2 } = google.auth;
const { getPool } = require('../config/database');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

class GoogleCalendarService {
  constructor() {
    this.oauth2Client = new OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  async setCredentialsForUser(userId) {
    const pool = await getPool();
    const [rows] = await pool.query('SELECT google_access_token, google_refresh_token FROM users WHERE id = ?', [userId]);
    
    if (rows.length > 0) {
      const { google_access_token, google_refresh_token } = rows[0];
      this.oauth2Client.setCredentials({
        access_token: google_access_token,
        refresh_token: google_refresh_token,
      });
    } else {
      throw new Error('User not found or Google Calendar not connected');
    }
  }

  async listEvents(userId, calendarId = 'primary') {
    await this.setCredentialsForUser(userId);
    try {
      const response = await this.calendar.events.list({
        calendarId: calendarId,
        timeMin: (new Date()).toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime',
      });
      return response.data.items;
    } catch (error) {
      console.error('Error listing events:', error);
      throw error;
    }
  }

  async addEvent(userId, event, calendarId = 'primary') {
    await this.setCredentialsForUser(userId);
    try {
      const response = await this.calendar.events.insert({
        calendarId: calendarId,
        resource: event,
      });
      return response.data;
    } catch (error) {
      console.error('Error adding event:', error);
      throw error;
    }
  }

  async updateEvent(userId, eventId, event, calendarId = 'primary') {
    await this.setCredentialsForUser(userId);
    try {
      const response = await this.calendar.events.update({
        calendarId: calendarId,
        eventId: eventId,
        resource: event,
      });
      return response.data;
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  async deleteEvent(userId, eventId, calendarId = 'primary') {
    await this.setCredentialsForUser(userId);
    try {
      await this.calendar.events.delete({
        calendarId: calendarId,
        eventId: eventId,
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }
}

module.exports = new GoogleCalendarService();

