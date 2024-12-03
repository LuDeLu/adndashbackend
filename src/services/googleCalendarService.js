const { google } = require('googleapis');
const { OAuth2 } = google.auth;

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

const oauth2Client = new OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

class GoogleCalendarService {
  constructor() {
    this.calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  }

  setCredentials(tokens) {
    oauth2Client.setCredentials(tokens);
  }

  async listEvents(calendarId = 'primary') {
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

  async addEvent(event, calendarId = 'primary') {
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

  async updateEvent(eventId, event, calendarId = 'primary') {
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

  async deleteEvent(eventId, calendarId = 'primary') {
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

