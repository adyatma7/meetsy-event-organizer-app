const importService = require('./import.service');
const eventsService = require('../events/events.service');
const { mapColumns, standardizeEventNames } = require('../etl/ai.service');

// Column name aliases that mean "event name" — case-insensitive matching
const EVENT_COLUMN_ALIASES = [
  'event name', 'event_name', 'eventname', 'event', 'event title', 'event_title',
  'nama event', 'nama acara', 'acara'
];

/**
 * Detect which column (if any) in the CSV holds the event name.
 * Returns the exact column key string, or null if not found.
 */
function detectEventColumn(rows) {
  if (!rows || rows.length === 0) return null;
  const headers = Object.keys(rows[0]);
  return headers.find(h => EVENT_COLUMN_ALIASES.includes(h.toLowerCase().trim())) || null;
}

async function uploadCSV(req, res, next) {
  try {
    const { data, eventId, newEventName, useEventColumn } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ success: false, message: 'Invalid payload. Expected an array of objects.' });
    }

    let finalEventId = eventId || null;
    let eventColumnKey = null;

    // ── Mode 1: Detect event name column in CSV — actual event creation happens
    //           inside the background processor ONLY for rows that pass ETL ──
    if (useEventColumn) {
      eventColumnKey = detectEventColumn(data);
      // Don't pre-create events here. The background processor will create them
      // lazily per-row, only after each row successfully passes all ETL checks.
      finalEventId = null;
    }

    // ── Mode 2: Auto-name from filename (no event column in CSV) ──
    if (!useEventColumn && newEventName && newEventName.trim()) {
      const newEvent = await eventsService.upsertEventByTitle(newEventName.trim());
      finalEventId = newEvent.id;
    }

    const result = await importService.startImportSession('Upload', data, finalEventId, eventColumnKey);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function previewCSV(req, res, next) {
  try {
    const { headers, dataSample } = req.body;
    
    // 1. AI Column Mapping
    const columnMapping = await mapColumns(headers) || {};
    
    // 2. See if there is an event column detected
    const eventColumnKey = Object.keys(columnMapping).find(k => columnMapping[k] === 'eventName');
    
    let eventNameMapping = {};
    if (eventColumnKey && dataSample && dataSample.length > 0) {
      // Extract unique raw names from sample
      const rawNames = new Set();
      dataSample.forEach(r => {
        const val = r[eventColumnKey]?.toString().trim();
        if (val) rawNames.add(val);
      });
      
      // 3. Standardize the unique raw event names using AI
      if (rawNames.size > 0) {
        eventNameMapping = await standardizeEventNames(Array.from(rawNames));
      }
    }
    
    res.json({
      columnMapping,
      eventColumnKey,
      eventNameMapping
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  uploadCSV,
  previewCSV
};
