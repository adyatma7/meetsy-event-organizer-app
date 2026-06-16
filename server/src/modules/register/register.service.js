const prisma = require('../../lib/prisma');
const { standardizeParticipant } = require('../etl/cleaner');
const emailAdapter = require('../email/email.adapter');

async function getEventBySlug(slug) {
  const event = await prisma.event.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      slug: true,
      date: true,
      timeStart: true,
      timeEnd: true,
      city: true,
      venue: true,
      description: true,
      formSchema: true,
      status: true,
      capacity: true,
      _count: {
        select: { registrations: true }
      }
    }
  });

  if (!event) {
    throw new Error('Event not found');
  }

  if (event.status !== 'OPEN') {
    throw new Error('Registration is currently closed for this event.');
  }

  // Note: We removed the hard error for capacity here because we now support WAITLISTING.

  return event;
}

async function submitRegistration(slug, rawData) {
  // 1. Fetch and validate event
  const event = await getEventBySlug(slug);

  const { name, email, phone, company, jobTitle, industry, city, ...customAnswers } = rawData;

  if (!name || !email) {
    throw new Error('Name and email are required');
  }

  // Standardize core fields before DB insertion
  const cleanData = standardizeParticipant({ name, email, phone, company, jobTitle, industry, city });

  // 2. Fetch existing participant to do conditional overwrite
  const existing = await prisma.participant.findUnique({ where: { email: cleanData.email } });

  let participant;
  
  if (existing) {
    // Only overwrite existing data if the incoming data is not null or empty
    participant = await prisma.participant.update({
      where: { id: existing.id },
      data: {
        name: cleanData.name || existing.name,
        phone: cleanData.phone || existing.phone,
        company: cleanData.company || existing.company,
        jobTitle: cleanData.jobTitle || existing.jobTitle,
        industry: cleanData.industry || existing.industry,
        city: cleanData.city || existing.city,
        source: 'public_form'
      }
    });
  } else {
    // Create new
    participant = await prisma.participant.create({
      data: {
        name: cleanData.name,
        email: cleanData.email,
        phone: cleanData.phone || null,
        company: cleanData.company || null,
        jobTitle: cleanData.jobTitle || null,
        industry: cleanData.industry || null,
        city: cleanData.city || null,
        source: 'public_form'
      }
    });
  }

  // 3. Create Registration link
  try {
    const registration = await prisma.registration.create({
      data: {
        participantId: participant.id,
        eventId: event.id,
        status: 'PENDING',
        answers: customAnswers,
        channel: 'online'
      }
    });

    // Send corresponding Email notification
    await emailAdapter.sendPendingEmail(participant, event);

    return { success: true, registrationId: registration.id };
  } catch (err) {
    if (err.code === 'P2002') {
      throw new Error('You have already registered for this event with this email.');
    }
    throw err;
  }
}

module.exports = {
  getEventBySlug,
  submitRegistration
};
