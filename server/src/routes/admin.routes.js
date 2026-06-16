const express = require('express');
const router = express.Router();

const adminAuth = require('../middleware/adminAuth');

// All admin routes require JWT authentication
router.use(adminAuth);

// --- Events ---
const eventsController = require('../modules/events/events.controller');
router.get('/dashboard/metrics', eventsController.getGlobalMetrics);
router.get('/events', eventsController.getAll);
router.post('/events', eventsController.create);
router.get('/events/:id', eventsController.getById);
router.put('/events/:id', eventsController.update);
router.delete('/events/:id', eventsController.deleteEvent);
// router.patch('/events/:id/status', eventsController.updateStatus);
// router.get('/events/:id/form', eventsController.getFormSchema);
router.put('/events/:id/form', eventsController.updateFormSchema);

// --- Invite ---
const inviteController = require('../modules/invite/invite.controller');
router.get('/events/:id/invite/search', inviteController.search);
router.post('/events/:id/invite', inviteController.sendInvite);
router.post('/events/:id/invite/bulk', inviteController.bulkInvite);
// router.get('/events/:id/invite/log', inviteController.getLog);

// --- Approve ---
const approveController = require('../modules/approve/approve.controller');
router.get('/events/:id/approve', approveController.getList);
router.put('/events/:id/approve', approveController.bulkUpdate);
router.put('/events/:id/reject-all-pending', approveController.rejectAllPending);
// router.patch('/registrations/:regId/reject', approveController.reject);
// router.post('/events/:id/registrations/bulk', approveController.bulkAction);
// router.post('/registrations/:regId/resend-qr', approveController.resendQr);

// --- Reports ---
const reportsController = require('../modules/reports/reports.controller');
router.get('/events/:id/reports/metrics', reportsController.getMetrics);
router.get('/events/:id/reports/export', reportsController.getExportData);
router.post('/events/:id/reports/insights', reportsController.getInsights);
// router.get('/events/:id/report/filter', reportsController.filter);
// router.get('/events/:id/report/export/csv', reportsController.exportCsv);
// router.get('/events/:id/report/export/dashboard-csv', reportsController.exportDashboardCsv);
// router.post('/events/:id/report/export/pdf', reportsController.exportPdf);

// --- Data Management ---
const importController = require('../modules/import/import.controller');
const dataController = require('../modules/data/data.controller');
const managerController = require('../modules/data/manager.controller');

router.post('/data/import/preview', importController.previewCSV);
router.post('/data/import', importController.uploadCSV);
router.get('/data/participants', dataController.getParticipants);
router.post('/data/participants', dataController.createParticipant);
router.post('/data/participants/bulk-delete', dataController.bulkDeleteParticipants);
router.put('/data/participants/:id', dataController.updateParticipant);
router.delete('/data/participants/:id', dataController.deleteParticipant);
router.put('/data/registrations/:id/answers', dataController.updateRegistrationAnswers);
router.get('/data/participants/export', dataController.exportCSV);

// New AI Data Manager Routes
router.get('/data/batches', managerController.getBatches);
router.get('/data/batches/:id', managerController.getBatchById);
router.get('/data/flagged', managerController.getFlaggedData);
router.patch('/data/flagged/:id/resolve', managerController.resolveFlagged);
router.patch('/data/flagged/:id/discard', managerController.discardFlagged);
// router.post('/etl/batches/:id/import', etlController.importBatch);

// Placeholder: confirm routes are loading
router.get('/ping', (req, res) => {
  res.json({ message: 'Admin routes OK', admin: req.admin });
});
// --- System Admins ---
const systemAdminController = require('../modules/admin/admin.controller');
router.get('/users', systemAdminController.getAdmins);
router.post('/users', systemAdminController.createAdmin);
router.delete('/users/:id', systemAdminController.deleteAdmin);
router.put('/users/change-password', systemAdminController.changePassword);

module.exports = router;
