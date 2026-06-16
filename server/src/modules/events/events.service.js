const prisma = require('../../lib/prisma');
const bcrypt = require('bcryptjs');

// Helper to generate a slug from title
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

async function getAllEvents() {
  return await prisma.event.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { registrations: true }
      }
    }
  });
}

async function getEventById(id) {
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      _count: {
        select: { registrations: true }
      }
    }
  });
  
  if (!event) throw new Error('Event not found');
  return event;
}

async function createEvent(data) {
  const { title, slug, date, timeStart, timeEnd, city, venue, capacity, staffPin, ...rest } = data;
  
  const eventSlug = slug || generateSlug(title);
  
  // Hash the staff pin
  const staffPinHash = await bcrypt.hash(staffPin, 10);
  
  // Default minimal form schema: name, email
  const initialSchema = [
    { id: 'name', type: 'text', label: 'Full Name', required: true },
    { id: 'email', type: 'email', label: 'Email Address', required: true }
  ];

  return await prisma.event.create({
    data: {
      title,
      slug: eventSlug,
      date: new Date(date),
      timeStart,
      timeEnd,
      city,
      venue,
      capacity: parseInt(capacity, 10),
      staffPinHash,
      staffPinRaw: staffPin,
      formSchema: initialSchema,
      ...rest
    }
  });
}

async function updateEvent(id, data) {
  // If date is provided, ensure it's a Date object
  const updateData = { ...data };
  if (updateData.date) {
    updateData.date = new Date(updateData.date);
  }
  if (updateData.capacity !== undefined) {
    updateData.capacity = parseInt(updateData.capacity, 10);
  }
  if (updateData.staffPin) {
    updateData.staffPinHash = await bcrypt.hash(updateData.staffPin, 10);
    updateData.staffPinRaw = updateData.staffPin;
    delete updateData.staffPin;
  }

  return await prisma.event.update({
    where: { id },
    data: updateData
  });
}

async function updateFormSchema(id, schema) {
  return await prisma.event.update({
    where: { id },
    data: { formSchema: schema }
  });
}

async function deleteEvent(id) {
  // Check if there are any registrations
  const count = await prisma.registration.count({
    where: { eventId: id }
  });
  
  if (count > 0) {
    throw new Error(`Cannot delete event: There are ${count} participants registered.`);
  }

  // Delete all import batches associated with this event first (cascade manually or just delete)
  await prisma.importBatch.deleteMany({
    where: { eventId: id }
  });

  return await prisma.event.delete({
    where: { id }
  });
}

/**
 * Find an existing event by title (case-insensitive) or create a minimal stub.
 * Used during CSV import when the event name comes from a column in the data.
 */
async function upsertEventByTitle(title) {
  const normalizedTitle = title.trim();
  
  // Try to find existing event with same title (case-insensitive)
  const existing = await prisma.event.findFirst({
    where: { title: { equals: normalizedTitle, mode: 'insensitive' } }
  });
  if (existing) return existing;

  // Create a minimal stub event
  const slug = generateSlug(normalizedTitle) + '-' + Date.now();
  const initialSchema = [
    { id: 'name', type: 'text', label: 'Full Name', required: true },
    { id: 'email', type: 'email', label: 'Email Address', required: true }
  ];

  return await prisma.event.create({
    data: {
      title: normalizedTitle,
      slug,
      date: new Date(),
      timeStart: '09:00',
      timeEnd: '17:00',
      city: 'TBD',
      venue: 'TBD',
      capacity: 500,
      staffPinHash: '$2a$10$placeholder', // placeholder hash
      staffPinRaw: '0000',
      formSchema: initialSchema,
      status: 'DRAFT'
    }
  });
}

async function getGlobalMetrics() {
  const [totalEvents, totalParticipants, registrations, recentEvents] = await Promise.all([
    prisma.event.count(),
    prisma.participant.count(),
    prisma.registration.findMany({ select: { status: true } }),
    prisma.event.findMany({
      orderBy: { createdAt: 'desc' },
      include: { 
        registrations: {
          select: { status: true }
        }
      }
    })
  ]);

  const totalRegistrations = registrations.length;
  let pending = 0;
  let approved = 0;
  let attended = 0;

  for (const reg of registrations) {
    if (reg.status === 'PENDING') pending++;
    if (reg.status === 'APPROVED' || reg.status === 'ATTENDED') approved++;
    if (reg.status === 'ATTENDED') attended++;
  }

  const performanceTimeline = recentEvents.map(e => {
    let ePending = 0;
    let eApproved = 0;
    let eAttended = 0;
    
    e.registrations.forEach(reg => {
      if (reg.status === 'PENDING') ePending++;
      if (reg.status === 'APPROVED' || reg.status === 'ATTENDED') eApproved++;
      if (reg.status === 'ATTENDED') eAttended++;
    });

    const registrationsCount = e.registrations.length;
    const isOvercapacity = e.capacity > 0 && registrationsCount > e.capacity;
    const attractionScore = e.capacity > 0 ? Math.round((registrationsCount / e.capacity) * 100) : 0;
    const checkInRate = eApproved > 0 ? Math.round((eAttended / eApproved) * 100) : 0;
    
    return {
      id: e.id,
      slug: e.slug,
      status: e.status,
      name: e.title.length > 20 ? e.title.substring(0, 20) + '...' : e.title,
      fullTitle: e.title,
      registrations: registrationsCount,
      attended: eAttended,
      capacity: e.capacity === 0 ? null : e.capacity,
      isOvercapacity,
      attractionScore,
      checkInRate
    };
  }).reverse(); // chronological (left to right)

  return {
    totalEvents,
    activeEvents: await prisma.event.count({ where: { status: 'OPEN' } }),
    totalNetworkSize: totalParticipants,
    totalRegistrations,
    pendingApprovals: pending,
    globalCheckinRate: approved > 0 ? ((attended / approved) * 100).toFixed(1) : 0,
    performanceTimeline
  };
}

module.exports = {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  updateFormSchema,
  deleteEvent,
  upsertEventByTitle,
  getGlobalMetrics
};
