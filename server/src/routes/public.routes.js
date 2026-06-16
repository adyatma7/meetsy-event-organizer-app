const express = require('express');
const router = express.Router();

const authController = require('../modules/auth/auth.controller');

// --- Auth ---
router.post('/auth/login', authController.login);

// --- Public registration (no auth) ---
const registerController = require('../modules/register/register.controller');
router.get('/events/:slug', registerController.getEventPublic);
router.post('/events/:slug/register', registerController.submit);
// router.get('/events/:slug/status', registerController.checkStatus);

// Placeholder
router.get('/ping', (req, res) => {
  res.json({ message: 'Public routes OK' });
});

module.exports = router;
