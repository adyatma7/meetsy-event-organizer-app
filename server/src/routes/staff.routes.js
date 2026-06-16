const express = require('express');
const staffController = require('../modules/staff/staff.controller');
const staffAuth = require('../middleware/staffAuth');

const router = express.Router();

router.post('/login', staffController.login);

// Protected staff routes
router.use(staffAuth);
router.post('/scan', staffController.scan);
router.post('/onsite', staffController.onsiteRegister);
router.get('/stats/:slug', staffController.getStats);

module.exports = router;
