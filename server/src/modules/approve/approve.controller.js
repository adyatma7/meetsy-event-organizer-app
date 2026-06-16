const approveService = require('./approve.service');

async function getList(req, res, next) {
  try {
    const { id: eventId } = req.params;
    const { status } = req.query; // PENDING, APPROVED, REJECTED
    const registrations = await approveService.getRegistrations(eventId, status);
    res.json(registrations);
  } catch (error) {
    next(error);
  }
}

async function bulkUpdate(req, res, next) {
  try {
    const { id: eventId } = req.params;
    const { registrationIds, status } = req.body;

    if (!registrationIds || !Array.isArray(registrationIds) || !status) {
      return res.status(400).json({ success: false, message: 'Missing registrationIds array or status' });
    }

    const result = await approveService.updateStatus(eventId, registrationIds, status);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
async function rejectAllPending(req, res, next) {
  try {
    const { id: eventId } = req.params;
    const result = await approveService.rejectAllPending(eventId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getList,
  bulkUpdate,
  rejectAllPending
};
