const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const adminAuth = require('../../middleware/adminAuth');

// All routes in this file require admin authentication
router.use(adminAuth);

router.get('/', adminController.getAdmins);
router.post('/', adminController.createAdmin);
router.delete('/:id', adminController.deleteAdmin);
router.put('/change-password', adminController.changePassword);

module.exports = router;
