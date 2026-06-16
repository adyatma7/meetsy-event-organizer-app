const prisma = require('../../lib/prisma');
const jwt = require('jsonwebtoken');
const emailAdapter = require('../email/email.adapter');

const JWT_SECRET = process.env.JWT_SECRET;

async function getRegistrations(eventId, status) {
  const where = { eventId };
  if (status) {
    where.status = status;
  }

  const registrations = await prisma.registration.findMany({
    where,
    include: {
      participant: true
    },
    orderBy: { registeredAt: 'desc' }
  });

  return registrations;
}

async function updateStatus(eventId, registrationIds, newStatus) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new Error('Event not found');

  const registrations = await prisma.registration.findMany({
    where: {
      id: { in: registrationIds },
      eventId
    },
    include: { participant: true }
  });

  let successCount = 0;

  for (const reg of registrations) {
    if (reg.status === newStatus) continue;

    try {
      if (newStatus === 'APPROVED') {
        const qrToken = jwt.sign(
          { sub: reg.id, type: 'entry_qr' },
          JWT_SECRET
        );
        
        await prisma.registration.update({
          where: { id: reg.id },
          data: { status: 'APPROVED', qrToken }
        });

        await emailAdapter.sendApprovalEmail(reg.participant, event, qrToken);
        successCount++;
        
      } else if (newStatus === 'REJECTED') {
        await prisma.registration.update({
          where: { id: reg.id },
          data: { status: 'REJECTED' }
        });

        await emailAdapter.sendRejectionEmail(reg.participant, event);
        successCount++;

      } else {
        // Just updating status without emails (e.g. back to PENDING)
        await prisma.registration.update({
          where: { id: reg.id },
          data: { status: newStatus }
        });
        successCount++;
      }
    } catch (err) {
      console.error(`Error updating registration ${reg.id}:`, err);
    }
  }

  return { success: true, updatedCount: successCount };
}

/**
 * Rejects all remaining PENDING registrations for an event.
 */
async function rejectAllPending(eventId) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new Error('Event not found');

  const pendingRegistrations = await prisma.registration.findMany({
    where: { eventId, status: 'PENDING' },
    include: { participant: true }
  });

  if (pendingRegistrations.length === 0) {
    return { success: true, rejectedCount: 0 };
  }

  let rejectedCount = 0;

  for (const reg of pendingRegistrations) {
    try {
      await prisma.registration.update({
        where: { id: reg.id },
        data: { status: 'REJECTED' }
      });
      await emailAdapter.sendRejectionEmail(reg.participant, event);
      rejectedCount++;
    } catch (err) {
      console.error(`Failed to reject registration ${reg.id}:`, err);
    }
  }

  return { success: true, rejectedCount };
}

module.exports = {
  getRegistrations,
  updateStatus,
  rejectAllPending
};
