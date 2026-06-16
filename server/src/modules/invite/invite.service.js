const prisma = require('../../lib/prisma');
const jwt = require('jsonwebtoken');
const emailAdapter = require('../email/email.adapter');

const JWT_SECRET = process.env.JWT_SECRET;

async function searchParticipants(query = '', filters = {}) {
  let participantIds = null; // null means don't filter by IDs, [] means 0 results

  if (query) {
    const q = `%${query}%`;
    const rawIds = await prisma.$queryRaw`
      SELECT DISTINCT p.id
      FROM "Participant" p
      LEFT JOIN "Registration" r ON p.id = r."participantId"
      WHERE 
        p.name ILIKE ${q} OR
        p.email ILIKE ${q} OR
        p.company ILIKE ${q} OR
        p."jobTitle" ILIKE ${q} OR
        p.industry ILIKE ${q} OR
        p.city ILIKE ${q} OR
        r.answers::text ILIKE ${q}
      LIMIT 100
    `;
    participantIds = rawIds.map(row => row.id);
    if (participantIds.length === 0) return []; // Short circuit
  }

  const where = {};
  if (participantIds) {
    where.id = { in: participantIds };
  }

  if (filters.industry) {
    where.industry = { contains: filters.industry, mode: 'insensitive' };
  }

  if (filters.city) {
    where.city = { contains: filters.city, mode: 'insensitive' };
  }

  const participants = await prisma.participant.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  return participants;
}

async function inviteParticipant(eventId, participantId) {
  // 1. Get Event and Participant
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new Error('Event not found');

  const participant = await prisma.participant.findUnique({ where: { id: participantId } });
  if (!participant) throw new Error('Participant not found');

  // 2. Check if registration already exists
  const existing = await prisma.registration.findUnique({
    where: {
      participantId_eventId: {
        participantId,
        eventId
      }
    }
  });

  let registrationId;

  if (existing) {
    if (existing.status !== 'PENDING' && existing.status !== 'REJECTED') {
      throw new Error('Participant is already registered for this event.');
    }
    // If pending/rejected, just update invitedAt and channel
    const updated = await prisma.registration.update({
      where: { id: existing.id },
      data: { invitedAt: new Date(), channel: 'invite' }
    });
    registrationId = updated.id;
  } else {
    // Create new PENDING registration with invitedAt set
    const newReg = await prisma.registration.create({
      data: {
        participantId,
        eventId,
        status: 'PENDING',
        channel: 'invite',
        invitedAt: new Date()
      }
    });
    registrationId = newReg.id;
  }

  // 3. Send Invitation Email (contains link to registration form)
  await emailAdapter.sendInviteEmail(participant, event);

  return { success: true, registrationId };
}

async function bulkInviteParticipants(eventId, participantIds) {
  if (!Array.isArray(participantIds) || participantIds.length === 0) return { success: true, count: 0 };
  
  let successCount = 0;
  for (const id of participantIds) {
    try {
      await inviteParticipant(eventId, id);
      successCount++;
    } catch (e) {
      // If it fails (e.g. already registered), ignore and continue
    }
  }
  
  return { success: true, count: successCount };
}

module.exports = {
  searchParticipants,
  inviteParticipant,
  bulkInviteParticipants
};
