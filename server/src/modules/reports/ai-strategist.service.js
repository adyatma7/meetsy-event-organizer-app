const reportsService = require('./reports.service');
const prisma = require('../../lib/prisma');

/**
 * Generate AI Business Strategy Insights for an Event
 * 
 * Modular architecture:
 * To add a new AI provider (like OpenAI, Anthropic, Gemini), 
 * simply add a new block in the switch statement below.
 * 
 * @param {string} eventId - The ID of the event
 * @param {string} provider - The AI provider to use ('phi4' by default)
 */
async function generateInsights(eventId, provider = 'phi4') {
  // 1. Fetch Event and Metrics
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new Error('Event not found');

  const metrics = await reportsService.getMetrics(eventId);
  
  // 2. Determine Event State (Mid-Campaign vs Post-Mortem)
  const isClosed = event.status === 'CLOSED'; // assuming status exists, otherwise we just look at date
  // fallback logic if status isn't reliable
  const eventDate = new Date(event.startDate || event.createdAt);
  const now = new Date();
  const isPostMortem = isClosed || (eventDate < now);

  const stateContext = isPostMortem 
    ? "This event has already concluded. Please provide a Post-Mortem analysis. Suggest long-term strategic improvements for the NEXT time they run a similar event."
    : "This event is currently active and still accepting registrations (Mid-Campaign). Please provide immediate, tactical actions the organizer can take right now to boost attendance and balance demographics before the event happens.";

  // 3. Format Data Payload for the Prompt
  const payload = JSON.stringify({
    event_name: event.title,
    status: isPostMortem ? 'Closed' : 'Open',
    total_registered: metrics.totals.all,
    total_approved: metrics.totals.approved,
    total_attended: metrics.totals.attended,
    check_in_rate: metrics.conversionRate + '%',
    top_industries: metrics.charts.topIndustries.map(i => `${i.name}: ${i.count}`),
    top_job_titles: metrics.charts.topJobTitles.map(j => `${j.name}: ${j.count}`),
    registration_timeline: metrics.charts.registrationTimeline.slice(-7) // last 7 days velocity
  }, null, 2);

  const systemPrompt = `You are an expert, enterprise-level Event Strategist. 
Analyze the following event data and provide exactly 3 concrete, highly actionable recommendations to improve marketing, attendance, and sponsor targeting.
${stateContext}
Return the response as a valid JSON array of objects, where each object has a 'title' (string) and 'description' (string). No markdown blocks, just the JSON array.`;

  // 4. Call the Selected Provider
  let insights = [];

  switch (provider.toLowerCase()) {
    case 'phi4':
    case 'local':
      insights = await callPhi4Local(systemPrompt, payload);
      break;
    // Example of how to add a new provider:
    // case 'gemini':
    //   insights = await callGeminiCloud(systemPrompt, payload);
    //   break;
    // case 'openai':
    //   insights = await callOpenAICloud(systemPrompt, payload);
    //   break;
    default:
      insights = await callPhi4Local(systemPrompt, payload);
  }

  return insights;
}

/**
 * Phi-4 Implementation (Local via Ollama)
 */
async function callPhi4Local(systemPrompt, payload) {
  try {
    const response = await fetch(process.env.OLLAMA_URL || 'http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'phi4-mini',
        prompt: `${systemPrompt}\n\nDATA:\n${payload}`,
        stream: false,
        format: 'json'
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    try {
      let cleanText = data.response;
      // Strip markdown code blocks if the model ignored format: 'json'
      if (cleanText.includes('```')) {
        cleanText = cleanText.replace(/```json\n?/gi, '').replace(/```/g, '').trim();
      }
      
      const parsed = JSON.parse(cleanText);
      
      let finalArray = [];
      if (Array.isArray(parsed)) {
        finalArray = parsed;
      } else if (parsed.insights && Array.isArray(parsed.insights)) {
        finalArray = parsed.insights;
      } else if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
        finalArray = parsed.recommendations;
      } else {
        // Look for any array in the object values
        const found = Object.values(parsed).find(v => Array.isArray(v));
        if (found) finalArray = found;
      }

      if (finalArray.length > 0) return finalArray;
      
      throw new Error("No array found in parsed JSON");
    } catch (e) {
      console.error("Failed to parse Phi-4 JSON output:", data.response);
      return [
        { title: "Review Marketing Channels", description: "Increase ad spend on platforms where your top demographics are active." },
        { title: "Engagement Check", description: "Send a reminder email to pending registrants to confirm their attendance." },
        { title: "Sponsor Targeting", description: `Leverage your top industry data to pitch relevant sponsors.` }
      ];
    }
  } catch (error) {
    console.error("AI Generation Error:", error);
    // Fallback static insights if AI is unreachable
    return [
      { title: "Optimize Registration Flow", description: "Ensure the sign-up process is frictionless to convert more viewers into attendees." },
      { title: "Analyze Drop-off Rates", description: "Investigate why some approved attendees did not check in." },
      { title: "Leverage Demographics", description: "Use the top job titles to tailor the event content." }
    ];
  }
}

module.exports = {
  generateInsights
};
