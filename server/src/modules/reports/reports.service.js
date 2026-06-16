const prisma = require('../../lib/prisma');

async function getMetrics(eventId, filter = 'all') {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new Error('Event not found');

  const registrations = await prisma.registration.findMany({
    where: { eventId },
    include: { participant: true }
  });

  const totals = {
    all: registrations.length,
    pending: 0,
    approved: 0,
    rejected: 0,
    attended: 0
  };

  // Calculate totals across ALL registrations (so the top metric cards stay accurate regardless of filter)
  for (const reg of registrations) {
    if (reg.status === 'PENDING') totals.pending++;
    if (reg.status === 'APPROVED') totals.approved++;
    if (reg.status === 'REJECTED') totals.rejected++;
    if (reg.status === 'ATTENDED') {
      totals.attended++;
      totals.approved++; // Count attended as approved too
    }
  }

  // Filter registrations for charting if requested
  let chartRegistrations = registrations;
  if (filter === 'attended') {
    chartRegistrations = registrations.filter(r => r.status === 'ATTENDED');
  }

  const industries = {};
  const cities = {};
  const jobTitles = {};
  const timeline = {};
  
  // Custom Survey Data Processing & Drill-Down Maps
  const surveyData = {};
  const schema = Array.isArray(event.formSchema) ? event.formSchema : [];
  for (const field of schema) {
    if (['name', 'email', 'phone', 'company', 'jobTitle', 'industry', 'city'].includes(field.id)) continue;
    surveyData[field.id] = { label: field.label, type: field.type, counts: {}, texts: [] };
  }

  for (const reg of chartRegistrations) {
    const pInfo = { id: reg.participant.id, name: reg.participant.name, email: reg.participant.email };

    // Demographics
    const { industry, city, jobTitle } = reg.participant;
    if (industry) industries[industry] = (industries[industry] || { count: 0, participants: [] });
    if (industry) { industries[industry].count++; industries[industry].participants.push(pInfo); }

    if (city) cities[city] = (cities[city] || { count: 0, participants: [] });
    if (city) { cities[city].count++; cities[city].participants.push(pInfo); }

    if (jobTitle) jobTitles[jobTitle] = (jobTitles[jobTitle] || { count: 0, participants: [] });
    if (jobTitle) { jobTitles[jobTitle].count++; jobTitles[jobTitle].participants.push(pInfo); }

    // Timeline (Registration Velocity)
    const dateKey = reg.registeredAt.toISOString().split('T')[0]; // YYYY-MM-DD
    timeline[dateKey] = (timeline[dateKey] || { count: 0, participants: [] });
    timeline[dateKey].count++;
    timeline[dateKey].participants.push(pInfo);

    // Custom Answers
    if (reg.answers) {
      for (const [key, val] of Object.entries(reg.answers)) {
        if (surveyData[key]) {
          if (surveyData[key].type === 'text' || surveyData[key].type === 'textarea') {
            if (val && typeof val === 'string' && val.trim().length > 0) {
              surveyData[key].texts.push(val.trim());
            }
          } else {
            // handle arrays (checkboxes) or strings (radio/select)
            const values = Array.isArray(val) ? val : [val];
            for (const v of values) {
              if (v) {
                surveyData[key].counts[v] = (surveyData[key].counts[v] || { count: 0, participants: [] });
                surveyData[key].counts[v].count++;
                surveyData[key].counts[v].participants.push(pInfo);
              }
            }
          }
        }
      }
    }
  }

  // Format charts data
  const statusData = [
    { name: 'Pending', value: totals.pending },
    { name: 'Approved', value: totals.approved },
    { name: 'Rejected', value: totals.rejected }
  ];

  const topIndustries = Object.entries(industries)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([name, data]) => ({ name, count: data.count, participants: data.participants }));

  const topCities = Object.entries(cities)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([name, data]) => ({ name, count: data.count, participants: data.participants }));

  const topJobTitles = Object.entries(jobTitles)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([name, data]) => ({ name, count: data.count, participants: data.participants }));

  const registrationTimeline = Object.entries(timeline)
    .sort((a, b) => a[0].localeCompare(b[0])) // sort chronologically
    .map(([date, data]) => ({ date, count: data.count, participants: data.participants }));

  // Format custom survey charts
  const customSurveys = Object.values(surveyData).map(sd => {
    if (sd.type === 'text' || sd.type === 'textarea') {
      // Calculate word frequencies for word cloud
      const wordsMap = {};
      const ignoreWords = ['the', 'and', 'to', 'a', 'of', 'in', 'for', 'is', 'i', 'that', 'it', 'on', 'with', 'as', 'are', 'this', 'at'];
      sd.texts.forEach(text => {
        const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
        words.forEach(w => {
          if (w.length > 2 && !ignoreWords.includes(w)) {
            wordsMap[w] = (wordsMap[w] || 0) + 1;
          }
        });
      });
      const words = Object.entries(wordsMap)
        .map(([text, value]) => ({ text, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 50); // top 50 words
      return { label: sd.label, type: 'text', data: words };
    } else {
      // Format bar chart data
      const data = Object.entries(sd.counts)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, data]) => ({ name, count: data.count, participants: data.participants }));
      return { label: sd.label, type: sd.type, data };
    }
  });

  return {
    totals,
    conversionRate: totals.approved > 0 ? ((totals.attended / totals.approved) * 100).toFixed(1) : 0,
    charts: {
      statusData,
      topIndustries,
      topCities,
      topJobTitles,
      registrationTimeline,
      customSurveys
    }
  };
}

async function getExportData(eventId) {
  const registrations = await prisma.registration.findMany({
    where: { eventId },
    include: { participant: true, attendance: true },
    orderBy: { registeredAt: 'desc' }
  });

  return registrations.map(reg => {
    const p = reg.participant;
    
    // Base standard fields
    const base = {
      Registration_ID: reg.id,
      Status: reg.status,
      Registered_At: reg.registeredAt.toISOString(),
      Checked_In_At: reg.attendance ? reg.attendance.scannedAt.toISOString() : '',
      Participant_ID: p.id,
      Name: p.name,
      Email: p.email,
      Company: p.company || '',
      Job_Title: p.jobTitle || '',
      Industry: p.industry || '',
      City: p.city || '',
      Country: p.country || ''
    };

    // Flatten custom answers
    const answers = reg.answers || {};
    for (const [key, val] of Object.entries(answers)) {
      base[`Answer: ${key}`] = Array.isArray(val) ? val.join(', ') : val;
    }

    return base;
  });
}

module.exports = {
  getMetrics,
  getExportData
};
