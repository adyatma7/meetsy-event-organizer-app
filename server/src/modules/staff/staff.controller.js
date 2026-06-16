const staffService = require('./staff.service');

async function login(req, res, next) {
  try {
    const { slug, pin } = req.body;

    if (!slug || !pin) {
      return res.status(400).json({ success: false, message: 'Event slug and PIN are required' });
    }

    const result = await staffService.login(slug, pin);
    res.json({ success: true, ...result });
  } catch (error) {
    if (error.message === 'Invalid PIN' || error.message === 'Event not found') {
      return res.status(401).json({ success: false, message: error.message });
    }
    next(error);
  }
}

async function scan(req, res, next) {
  try {
    const { qrToken, slug } = req.body;
    let eventId;

    if (req.staff) {
      eventId = req.staff.eventId;
    } else if (req.admin) {
      if (!slug) return res.status(400).json({ success: false, message: 'Slug is required for admin bypass' });
      const event = await require('../../lib/prisma').event.findUnique({ where: { slug } });
      if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
      eventId = event.id;
    } else {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (!qrToken) {
      return res.status(400).json({ success: false, message: 'QR token is required' });
    }

    const result = await staffService.scanQr(eventId, qrToken);
    res.json(result);
  } catch (error) {
    // 400 Bad Request for business logic errors
    if (
      error.message.includes('Already scanned') || 
      error.message.includes('Invalid') || 
      error.message.includes('Cannot admit') ||
      error.message.includes('different event') ||
      error.message.includes('not found') ||
      error.message.includes('Unrecognized')
    ) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
}

async function onsiteRegister(req, res, next) {
  try {
    const { slug, name, email, company, jobTitle } = req.body;
    let eventId;

    if (req.staff) {
      eventId = req.staff.eventId;
    } else if (req.admin) {
      if (!slug) return res.status(400).json({ success: false, message: 'Slug is required for admin bypass' });
      const event = await require('../../lib/prisma').event.findUnique({ where: { slug } });
      if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
      eventId = event.id;
    } else {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required for walk-in registration' });
    }

    // 1. Check if participant already exists for this event
    const prisma = require('../../lib/prisma');
    const existingParticipant = await prisma.participant.findUnique({
      where: { eventId_email: { eventId, email } }
    });

    if (existingParticipant) {
      if (existingParticipant.status === 'ATTENDED') {
        return res.status(400).json({ success: false, message: 'Participant has already checked in.' });
      } else {
        // Just upgrade to ATTENDED
        const updated = await prisma.participant.update({
          where: { id: existingParticipant.id },
          data: { status: 'ATTENDED', attendedAt: new Date() }
        });
        return res.json({ success: true, message: 'Participant found and checked in!', data: updated });
      }
    }

    // 2. Doesn't exist, create via participantService.upsertParticipant
    const participantService = require('../participants/participants.service');
    const payload = {
      name,
      email,
      company,
      jobTitle,
      answers: {} // skip custom questions
    };

    // Use the existing upsert logic, but force the final status
    const result = await participantService.upsertParticipant(eventId, payload);
    
    // update status to ATTENDED since upsertParticipant might default to PENDING/APPROVED
    const updated = await prisma.participant.update({
      where: { id: result.id },
      data: { status: 'ATTENDED', attendedAt: new Date() }
    });

    res.json({ success: true, message: 'Walk-in registered and checked in!', data: updated });
  } catch (error) {
    next(error);
  }
}

async function getStats(req, res, next) {
  try {
    const { slug } = req.params;
    let eventId;

    if (req.staff) {
      eventId = req.staff.eventId;
    } else if (req.admin) {
      if (!slug) return res.status(400).json({ success: false, message: 'Slug is required for admin bypass' });
      const event = await require('../../lib/prisma').event.findUnique({ where: { slug } });
      if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
      eventId = event.id;
    } else {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const prisma = require('../../lib/prisma');
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { capacity: true }
    });

    const checkedInCount = await prisma.participant.count({
      where: {
        registrations: { some: { eventId, status: 'ATTENDED' } }
      }
    });

    res.json({ success: true, capacity: event.capacity, checkedIn: checkedInCount });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  scan,
  onsiteRegister,
  getStats
};
