const eventService = require('../services/eventService');
const asyncHandler = require('../utils/asyncHandler');

const getAllEvents = asyncHandler(async (req, res) => {
  const events = await eventService.getAllEvents(req.user.userId);
  res.json(events);
});

const createEvent = asyncHandler(async (req, res) => {
  const eventId = await eventService.createEvent(req.user.userId, req.body);
  res.status(201).json({ 
    id: eventId, 
    message: 'Event created successfully' 
  });
});

const updateEvent = asyncHandler(async (req, res) => {
  await eventService.updateEvent(req.user.userId, req.params.id, req.body);
  res.json({ message: 'Event updated successfully' });
});

const deleteEvent = asyncHandler(async (req, res) => {
  await eventService.deleteEvent(req.user.userId, req.params.id);
  res.json({ message: 'Event deleted successfully' });
});

module.exports = {
  getAllEvents,
  createEvent,
  updateEvent,
  deleteEvent
};