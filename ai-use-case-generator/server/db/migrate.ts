import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

export async function runMigrations() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });

    try {
        const filePath = path.join(process.cwd(), 'server/db/migrations.sql');
        console.log('Looking for migrations at:', filePath);

        if (!fs.existsSync(filePath)) {
            throw new Error(`Migration file NOT FOUND at: ${filePath}. Dir contents: ${fs.readdirSync(path.dirname(filePath)).join(', ')}`);
        }

        const migrationSQL = fs.readFileSync(filePath, 'utf-8');

        await pool.query(migrationSQL);
        console.log('✅ Database migrations completed successfully');
    } catch (error) {
        console.error('❌ Migration error:', error);
        throw error; // Re-throw to be caught by the API
    } finally {
        await pool.end();
    }
}
