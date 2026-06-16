const reportsService = require('./reports.service');
const aiStrategistService = require('./ai-strategist.service');

async function getMetrics(req, res, next) {
  try {
    const { id: eventId } = req.params;
    const { filter } = req.query; // 'all' or 'attended'
    const metrics = await reportsService.getMetrics(eventId, filter);
    res.json({ success: true, ...metrics });
  } catch (error) {
    next(error);
  }
}

async function getExportData(req, res, next) {
  try {
    const { id: eventId } = req.params;
    const data = await reportsService.getExportData(eventId);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

async function getInsights(req, res, next) {
  try {
    const { id: eventId } = req.params;
    const { provider } = req.body; // frontend will POST this
    const insights = await aiStrategistService.generateInsights(eventId, provider);
    res.json({ success: true, insights });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMetrics,
  getExportData,
  getInsights
};
