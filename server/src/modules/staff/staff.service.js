const prisma = require('../../lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

async function login(slug, pin) {
  const event = await prisma.event.findUnique({
    where: { slug }
  });

  if (!event) {
    throw new Error('Event not found');
  }

  const isMatch = await bcrypt.compare(pin, event.staffPinHash);

  if (!isMatch) {
    throw new Error('Invalid PIN');
  }

  const token = jwt.sign(
    { role: 'staff', eventId: event.id },
    JWT_SECRET,
    { expiresIn: '12h' } // Staff session lasts 12 hours
  );

  return { token, eventId: event.id, title: event.title };
}

async function scanQr(eventId, qrToken) {
  let decoded;
  try {
    decoded = jwt.verify(qrToken, JWT_SECRET);
  } catch (err) {
    throw new Error('Invalid or corrupted QR code');
  }

  if (decoded.type !== 'entry_qr' || !decoded.sub) {
    throw new Error('Unrecognized QR format');
  }

  const registrationId = decoded.sub;

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { participant: true }
  });

  if (!registration) {
    throw new Error('Registration not found');
  }

  if (registration.eventId !== eventId) {
    throw new Error('This ticket is for a different event');
  }

  if (registration.status !== 'APPROVED') {
    throw new Error(`Cannot admit. Ticket status is ${registration.status}`);
  }

  try {
    const attendance = await prisma.attendance.create({
      data: {
        registrationId,
        scannedBy: 'staff_scanner'
      }
    });

    // Optionally update registration status to ATTENDED
    await prisma.registration.update({
      where: { id: registrationId },
      data: { status: 'ATTENDED' }
    });

    return { 
      success: true, 
      participant: {
        name: registration.participant.name,
        company: registration.participant.company
      },
      scannedAt: attendance.scannedAt
    };
  } catch (err) {
    if (err.code === 'P2002') {
      // Prisma unique constraint violation on registrationId
      const existing = await prisma.attendance.findUnique({ where: { registrationId } });
      const timeStr = existing ? new Date(existing.scannedAt).toLocaleTimeString() : 'earlier';
      throw new Error(`Already scanned at ${timeStr}`);
    }
    throw err;
  }
}

module.exports = {
  login,
  scanQr
};
