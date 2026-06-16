const registerService = require('./register.service');

async function getEventPublic(req, res, next) {
  try {
    const { slug } = req.params;
    const event = await registerService.getEventBySlug(slug);
    
    res.json({ success: true, data: event });
  } catch (err) {
    if (err.message.includes('not found') || err.message.includes('closed') || err.message.includes('capacity')) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
}

async function submit(req, res, next) {
  try {
    const { slug } = req.params;
    const result = await registerService.submitRegistration(slug, req.body);
    
    res.status(201).json(result);
  } catch (err) {
    if (err.message.includes('already registered') || err.message.includes('required') || err.message.includes('capacity')) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
}

// Check status is an optional utility if we want to build a "check registration status" page later
async function checkStatus(req, res, next) {
  res.status(501).json({ success: false, message: 'Not implemented' });
}

module.exports = {
  getEventPublic,
  submit,
  checkStatus
};
