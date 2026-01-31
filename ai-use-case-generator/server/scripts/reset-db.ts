import { db } from '../db';
import { users } from '../db/schema';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

async function resetAndSeed() {
    console.log('🗑️  Clearing all users...');
    await db.delete(users);

    console.log('🌱 Seeding new admin account...');
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash('admin123', saltRounds);

    const [admin] = await db.insert(users).values({
        email: 'admin@thedewpointgroup.com',
        name: 'The DewPoint Group Admin',
        passwordHash,
        role: 'admin',
        isActive: true,
        createdAt: new Date(),
        lastLogin: new Date()
    }).returning();

    console.log(`✅ Created Admin: ${admin.email} (ID: ${admin.id})`);
    process.exit(0);
}

resetAndSeed().catch((err) => {
    console.error('❌ Failed:', err);
    process.exit(1);
});
