const inviteService = require('./invite.service');

async function search(req, res, next) {
  try {
    const { q, industry, city } = req.query;
    const participants = await inviteService.searchParticipants(q || '', { industry, city });
    res.json(participants);
  } catch (error) {
    next(error);
  }
}

async function sendInvite(req, res, next) {
  try {
    const { id: eventId } = req.params;
    const { participantId } = req.body;

    if (!participantId) {
      return res.status(400).json({ success: false, message: 'participantId is required' });
    }

    const result = await inviteService.inviteParticipant(eventId, participantId);
    res.json(result);
  } catch (error) {
    if (error.message.includes('already invited')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
}

async function bulkInvite(req, res, next) {
  try {
    const { id: eventId } = req.params;
    const { participantIds } = req.body;

    if (!participantIds || !Array.isArray(participantIds)) {
      return res.status(400).json({ success: false, message: 'participantIds array is required' });
    }

    const result = await inviteService.bulkInviteParticipants(eventId, participantIds);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  search,
  sendInvite,
  bulkInvite
};
