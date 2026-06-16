const prisma = require('../../lib/prisma');
const { standardizeParticipant, capitalizeWords, normalizeColumns } = require('../etl/cleaner');
const { mapColumns, applyColumnMapping, standardizeData, standardizeEventNames } = require('../etl/ai.service');
const { upsertEventByTitle } = require('../events/events.service');

// Spam / junk detection helpers
const SPAM_PATTERNS = [
  /test/i, /^(n\/a|na|none|null|undefined|nil|fake|dummy|sample|example|xxx+)$/i,
  /^[a-z]{1,2}$/i,  // single letter names like "a", "ab"
];
const SPAM_EMAIL_DOMAINS = ['mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email', 'yopmail.com', 'sharklasers.com'];

function isSpamValue(val) {
  if (!val) return true;
  const s = String(val).trim();
  if (s.length === 0) return true;
  if (SPAM_PATTERNS.some(p => p.test(s))) return true;
  return false;
}

function isSpamEmail(email) {
  if (!email) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  return SPAM_EMAIL_DOMAINS.includes(domain);
}

function isNullLike(val) {
  if (val === null || val === undefined) return true;
  const s = String(val).trim().toLowerCase();
  return ['', 'null', 'undefined', 'nan', 'n/a', 'na', 'none', '-', '--', '?'].includes(s);
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// Asynchronous background processor
async function processBatchInBackground(batchId, participantsArray, eventId, eventColumnKey, precomputedColumnMapping, precomputedEventNameMapping) {
  let cleanedCount = 0;
  let aiCount = 0;
  let flaggedCount = 0;
  let discardedCount = 0;

  // Track emails and names already seen in THIS batch for intra-batch deduplication
  const seenEmails = new Set();
  const seenNames = new Set();
  // Cache event name → event ID lookups to avoid repeated DB calls
  const eventTitleCache = {};

  try {
    // Update batch: Phase 0 starting
  await prisma.importBatch.update({
    where: { id: batchId },
    data: { currentPhase: 'mapping_columns' }
  });

  // ── PHASE 0: ONE-SHOT AI Column Mapping (runs once before the row loop) ──
  // Ask phi4-mini to map every CSV header to a schema field or "custom".
  // Falls back to hardcoded aliases if AI is unavailable.
  let columnMapping = precomputedColumnMapping || null;
  if (!columnMapping && participantsArray.length > 0) {
    const headers = Object.keys(participantsArray[0]);
    console.log(`[ETL] Phase 0: mapping ${headers.length} column headers via AI...`);
    columnMapping = await mapColumns(headers);
    if (columnMapping) {
      console.log('[ETL] Phase 0 mapping:', JSON.stringify(columnMapping));
    } else {
      console.log('[ETL] Phase 0 AI unavailable — using hardcoded alias fallback.');
    }
  }

  // ── PHASE 0.5: Determine Event Column and Standardize Event Names ──
  if (!eventColumnKey && columnMapping) {
    eventColumnKey = Object.keys(columnMapping).find(k => columnMapping[k] === 'eventName');
  }

  let eventNameMapping = precomputedEventNameMapping || null;
  if (!eventNameMapping && eventColumnKey && participantsArray.length > 0) {
    const rawNames = new Set();
    participantsArray.forEach(r => {
      const val = r[eventColumnKey]?.toString().trim();
      if (val) rawNames.add(val);
    });
    if (rawNames.size > 0) {
      eventNameMapping = await standardizeEventNames(Array.from(rawNames));
    }
  }

  // Update batch: Phase 0 done, now processing rows
  await prisma.importBatch.update({
    where: { id: batchId },
    data: { currentPhase: 'processing_rows' }
  });

  for (let i = 0; i < participantsArray.length; i++) {
    const rawData = participantsArray[i];

    // Discard completely empty rows silently
    if (!rawData || Object.keys(rawData).length === 0) {
      discardedCount++;
      continue;
    }

    try {
      // ── STEP 0: Apply AI column mapping (or hardcoded fallback) ──
      // This renames messy CSV headers to standard schema field names.
      let rowData;
      if (columnMapping) {
        rowData = applyColumnMapping(columnMapping, rawData);
      } else {
        // Fallback: use hardcoded alias dictionary from cleaner.js
        rowData = normalizeColumns(rawData);
      }

      // ── STEP 1: Format standardization (title case, trim, lowercase email) ──
      const codeCleaned = standardizeParticipant(rowData);

      let finalData = codeCleaned;
      let flaggedReason = null;
      let wasAIUsed = false;

      // ── STEP 2: Hardcoded Validation ──
      // 2a. Name must exist and not be null/NaN/junk
      if (!flaggedReason) {
        if (isNullLike(finalData.name)) {
          flaggedReason = 'Missing name: name field is null or empty.';
        } else if (isSpamValue(finalData.name)) {
          flaggedReason = `Spam/invalid name detected: "${finalData.name}".`;
        }
      }

      // 2b. Email must exist, be valid format, and not be a spam domain
      if (!flaggedReason) {
        if (isNullLike(finalData.email)) {
          flaggedReason = 'Missing email: email field is null or empty.';
        } else if (!isValidEmail(finalData.email)) {
          flaggedReason = `Invalid email format: "${finalData.email}".`;
        } else if (finalData.email.toLowerCase().includes('missing')) {
          flaggedReason = `Invalid email: AI hallucinated placeholder "${finalData.email}".`;
        } else if (isSpamEmail(finalData.email)) {
          flaggedReason = `Spam/disposable email address detected: "${finalData.email}".`;
        }
      }

      // ── STEP 3: Intra-batch duplicate detection (same CSV file) ──
      let csvDupDBRecord = null; // DB record matching this CSV duplicate (if any)
      if (!flaggedReason) {
        const emailKey = finalData.email?.toLowerCase();
        const nameKey = finalData.name?.toLowerCase().trim();

        const emailSeen = emailKey && seenEmails.has(emailKey);
        const nameSeen = nameKey && seenNames.has(nameKey);

        if (emailSeen || nameSeen) {
          const conflictField = emailSeen && nameSeen ? 'name and email' : emailSeen ? 'email' : 'name';
          flaggedReason = `CSV Duplicate: Another row in this file has the same ${conflictField} ("${conflictField.includes('email') ? emailKey : nameKey}").`;
          // Also fetch the DB record for this email so the frontend can show the anchor
          if (finalData.email) {
            csvDupDBRecord = await prisma.participant.findUnique({ where: { email: finalData.email } });
          }
        } else {
          // Register this row so future rows can be checked against it
          if (emailKey) seenEmails.add(emailKey);
          if (nameKey) seenNames.add(nameKey);
        }
      }

      // ── STEP 4: Database duplicate detection ──
      // Only run if validation passed — check both email AND name against DB
      let existingByEmail = null;
      let existingByName = null;

      if (!flaggedReason) {
        // Check email
        existingByEmail = await prisma.participant.findUnique({
          where: { email: finalData.email }
        });

        // Check name (case-insensitive) — only if no email match found
        if (!existingByEmail && finalData.name) {
          existingByName = await prisma.participant.findFirst({
            where: { name: { equals: finalData.name, mode: 'insensitive' } }
          });
        }

        // If name matches a different person → flag as potential duplicate
        if (!existingByEmail && existingByName) {
          flaggedReason = `Possible duplicate: A participant named "${existingByName.name}" (${existingByName.email}) already exists in the database.`;
        }
      }

      // ── STEP 5: Check for data conflict on email match ──
      let hasConflict = false;
      if (!flaggedReason && existingByEmail) {
        const checkFields = ['name', 'phone', 'company', 'jobTitle', 'industry', 'city'];
        for (const field of checkFields) {
          if (finalData[field] && existingByEmail[field] && finalData[field].toLowerCase() !== existingByEmail[field].toLowerCase()) {
            hasConflict = true;
            break;
          }
        }
        if (hasConflict) {
          flaggedReason = 'Duplicate Conflict';
        }
      }

      // ── STEP 6: AI enrichment — only for rows that passed all checks ──
      if (!flaggedReason) {
        const missingFields = ['company', 'industry', 'jobTitle', 'city'].filter(f => !finalData[f]);
        if (missingFields.length > 0) {
          // Update phase to show AI is actively working
          if (i % 5 === 0) {
            await prisma.importBatch.update({
              where: { id: batchId },
              data: { currentPhase: 'ai_enrichment' }
            });
          }
          const aiResult = await standardizeData(finalData);
          // New: AI only returns the missing fields, never flags
          if (aiResult && !aiResult.flagged) {
            finalData = {
              ...finalData,
              company:  finalData.company  || aiResult.company  || '',
              industry: finalData.industry || aiResult.industry || '',
              jobTitle: finalData.jobTitle || aiResult.jobTitle || '',
              city:     finalData.city     || aiResult.city     || '',
            };
            wasAIUsed = true;
          }
        }
      }

      // ── Handle flagged rows ──
      if (flaggedReason) {
        
        // Save the AI's intended event name so admin resolution can lazily create the exact same event later
        let plannedEventName = null;
        if (eventColumnKey) {
          const rawEv = rawData[eventColumnKey]?.toString().trim();
          if (rawEv) {
            plannedEventName = eventNameMapping?.[rawEv] || capitalizeWords(rawEv);
          }
        }

        // Categorize the reason for the frontend to color-code
        let reasonCategory = 'validation';
        if (flaggedReason.startsWith('Duplicate Conflict')) reasonCategory = 'duplicate_conflict';
        else if (flaggedReason.startsWith('CSV Duplicate')) reasonCategory = 'duplicate_csv';
        else if (flaggedReason.startsWith('Possible duplicate')) reasonCategory = 'duplicate_name';
        else if (flaggedReason.startsWith('Missing')) reasonCategory = 'missing_field';
        else if (flaggedReason.startsWith('Invalid')) reasonCategory = 'invalid_field';
        else if (flaggedReason.startsWith('Spam')) reasonCategory = 'spam';

        // The DB anchor record: use whichever lookup found something
        const dbAnchorRecord = (existingByEmail && hasConflict ? existingByEmail : null)
                            || csvDupDBRecord
                            || (existingByName && flaggedReason.startsWith('Possible duplicate') ? existingByName : null);

        await prisma.flaggedData.create({
          data: {
            batchId,
            rawData: {
              __originalCSV: rawData,
              __standardized: finalData,
              ...(dbAnchorRecord ? { __existing: dbAnchorRecord } : {}),
              __standardizedEventName: plannedEventName,
              __eventColumnKey: eventColumnKey,
              __reasonCategory: reasonCategory,
            },
            reason: flaggedReason,
            status: 'PENDING'
          }
        });
        flaggedCount++;
      } else {
        // ── STEP 7: Save to database ──
        let participantId;
        
        // Resolve per-row event ID:
        // If eventColumnKey is set, read the raw event name from this row, standardize it
        // (title case), then lazily upsert the event — only clean rows reach here.
        let rowEventId = eventId; // fall back to batch-level eventId
        if (eventColumnKey) {
          const rawEventName = rawData[eventColumnKey]?.toString().trim();
          if (rawEventName) {
            // Standardize: use the AI-generated eventNameMapping if available, otherwise just Title Case
            let standardizedEventName = eventNameMapping?.[rawEventName];
            if (!standardizedEventName) {
              standardizedEventName = capitalizeWords(rawEventName);
            }
            // Use cache to avoid repeated DB calls for the same event name
            if (!eventTitleCache[standardizedEventName]) {
              const ev = await upsertEventByTitle(standardizedEventName);
              eventTitleCache[standardizedEventName] = ev.id;
            }
            rowEventId = eventTitleCache[standardizedEventName];
          } else {
            rowEventId = null; // no event name in this row
          }
        }

        if (existingByEmail) {
          // Non-conflicting update: fill in any empty fields
          await prisma.participant.update({
            where: { id: existingByEmail.id },
            data: {
              name: finalData.name || existingByEmail.name,
              phone: finalData.phone || existingByEmail.phone,
              company: finalData.company || existingByEmail.company,
              jobTitle: finalData.jobTitle || existingByEmail.jobTitle,
              industry: finalData.industry || existingByEmail.industry,
              city: finalData.city || existingByEmail.city,
            }
          });
          participantId = existingByEmail.id;
        } else {
          const newPart = await prisma.participant.create({
            data: {
              email: finalData.email,
              name: finalData.name,
              phone: finalData.phone || null,
              company: finalData.company || null,
              jobTitle: finalData.jobTitle || null,
              industry: finalData.industry || null,
              city: finalData.city || null,
            }
          });
          participantId = newPart.id;
        }

        // Process Event-Specific Custom Answers
        // IMPORTANT: iterate finalData (schema-mapped keys) NOT rawData (original messy keys)
        // This ensures "Job Role", "City Location" etc. don't bleed into JSONB after mapping.
        if (rowEventId) {
          const STANDARD_FIELDS = new Set(['email', 'name', 'phone', 'company', 'jobtitle', 'industry', 'city']);
          
          const customAnswers = {};
          // Use finalData which already has standard field names — any key NOT in STANDARD_FIELDS is a genuine custom answer
          for (const [key, value] of Object.entries(finalData)) {
            const lk = key.toLowerCase().trim();
            if (
              !STANDARD_FIELDS.has(lk) &&          // not a schema field
              lk !== eventColumnKey?.toLowerCase().trim() && // not the AI-detected event column
              !key.startsWith('__') &&              // not an internal marker
              value !== null && value !== undefined && value !== ''
            ) {
              customAnswers[key] = String(value);
            }
          }

          const existingReg = await prisma.registration.findUnique({
            where: { participantId_eventId: { participantId, eventId: rowEventId } }
          });

          const targetStatus = eventId ? 'APPROVED' : 'ATTENDED';

          if (existingReg) {
            await prisma.registration.update({
              where: { id: existingReg.id },
              data: { answers: { ...(existingReg.answers || {}), ...customAnswers }, status: targetStatus }
            });
          } else {
            await prisma.registration.create({
              data: { participantId, eventId: rowEventId, answers: customAnswers, status: targetStatus }
            });
          }
        }

        wasAIUsed ? aiCount++ : cleanedCount++;
      }

    } catch (err) {
      console.error(`Error processing row ${i}:`, err);
      await prisma.flaggedData.create({
        data: {
          batchId,
          rawData: rawData,
          reason: `System error: ${err.message}`,
          status: 'PENDING'
        }
      });
      flaggedCount++;
    }

    // Update batch stats every 10 rows
    if (i % 10 === 0) {
      await prisma.importBatch.update({
        where: { id: batchId },
        data: {
          cleanedRows: cleanedCount,
          aiRows: aiCount,
          flaggedRows: flaggedCount,
          discardedRows: discardedCount,
          currentPhase: 'processing_rows'
        }
      });
    }
  }

    // Final batch update
    await prisma.importBatch.update({
      where: { id: batchId },
      data: {
        status: 'complete',
        currentPhase: 'complete',
        cleanedRows: cleanedCount,
        aiRows: aiCount,
        flaggedRows: flaggedCount,
        discardedRows: discardedCount
      }
    });
  } catch (error) {
    console.error(`Fatal error in background batch ${batchId}:`, error);
    await prisma.importBatch.update({
      where: { id: batchId },
      data: {
        status: 'failed',
        currentPhase: 'failed'
      }
    }).catch(e => console.error('Failed to update batch status to failed:', e));
  }
}

async function startImportSession(filename, participantsArray, eventId, eventColumnKey, precomputedColumnMapping, precomputedEventNameMapping) {
  if (!Array.isArray(participantsArray) || participantsArray.length === 0) {
    throw new Error('Input must be a non-empty array of participants');
  }

  // Create the batch record
  const batch = await prisma.importBatch.create({
    data: {
      filename: filename || 'Upload',
      totalRows: participantsArray.length,
      status: 'processing',
      eventId: eventId || null
    }
  });

  // Start background processing (do NOT await it here)
  processBatchInBackground(batch.id, participantsArray, eventId || null, eventColumnKey || null, precomputedColumnMapping, precomputedEventNameMapping).catch(console.error);

  return { 
    success: true, 
    batchId: batch.id,
    message: 'Batch started processing asynchronously.'
  };
}

module.exports = {
  startImportSession
};
