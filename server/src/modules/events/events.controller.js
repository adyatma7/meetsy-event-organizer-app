const eventsService = require('./events.service');

async function getAll(req, res, next) {
  try {
    const events = await eventsService.getAllEvents();
    res.json({ success: true, data: events });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const event = await eventsService.getEventById(req.params.id);
    res.json({ success: true, data: event });
  } catch (err) {
    if (err.message === 'Event not found') return res.status(404).json({ success: false, message: err.message });
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const requiredFields = ['title', 'date', 'timeStart', 'timeEnd', 'city', 'venue', 'capacity', 'staffPin'];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ success: false, message: `Missing required field: ${field}` });
      }
    }

    if (req.body.staffPin.length !== 6 || !/^\d+$/.test(req.body.staffPin)) {
      return res.status(400).json({ success: false, message: 'Staff PIN must be exactly 6 digits.' });
    }

    const newEvent = await eventsService.createEvent(req.body);
    res.status(201).json({ success: true, data: newEvent });
  } catch (err) {
    // Handle Prisma unique constraint violations (e.g. duplicate slug)
    if (err.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'An event with this slug already exists.' });
    }
    next(err);
  }
}

async function update(req, res, next) {
  try {
    if (req.body.staffPin && (req.body.staffPin.length !== 6 || !/^\d+$/.test(req.body.staffPin))) {
      return res.status(400).json({ success: false, message: 'Staff PIN must be exactly 6 digits.' });
    }
    const updatedEvent = await eventsService.updateEvent(req.params.id, req.body);
    res.json({ success: true, data: updatedEvent });
  } catch (err) {
    next(err);
  }
}

async function updateFormSchema(req, res, next) {
  try {
    const { schema } = req.body;
    if (!Array.isArray(schema)) {
      return res.status(400).json({ success: false, message: 'Schema must be an array of objects.' });
    }

    const updatedEvent = await eventsService.updateFormSchema(req.params.id, schema);
    res.json({ success: true, data: updatedEvent.formSchema });
  } catch (err) {
    next(err);
  }
}

async function deleteEvent(req, res, next) {
  try {
    await eventsService.deleteEvent(req.params.id);
    res.json({ success: true, message: 'Event deleted successfully.' });
  } catch (err) {
    if (err.message.startsWith('Cannot delete event:')) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
}

async function getGlobalMetrics(req, res, next) {
  try {
    const metrics = await eventsService.getGlobalMetrics();
    res.json({ success: true, data: metrics });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  updateFormSchema,
  deleteEvent,
  getGlobalMetrics
};
