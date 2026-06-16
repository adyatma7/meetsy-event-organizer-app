/**
 * Demo Data Seeder
 *
 * Creates initial admin account and sample data for development.
 * Run with: npm run db:seed
 */

require('dotenv').config();
const prisma = require('./prisma');
const bcrypt = require('bcryptjs');

async function seed() {
  console.log('🌱 Seeding database...\n');

  // --- Create admin account ---
  const email = process.env.ADMIN_EMAIL || 'admin@Meetsy.com';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.admin.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });

  console.log(`✅ Admin created: ${admin.email}`);

  // --- TODO: Add sample events, participants, registrations ---
  // Will be populated in Phase 9 (Polish)

  console.log('\n🌱 Seeding complete!\n');
}

seed()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
