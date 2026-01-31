import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

export async function runMigrations() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });

    try {
        const migrationSQL = fs.readFileSync(
            path.join(__dirname, 'migrations.sql'),
            'utf-8'
        );

        await pool.query(migrationSQL);
        console.log('✅ Database migrations completed successfully');
    } catch (error) {
        console.error('❌ Migration error:', error);
        // Don't throw - allow server to start even if migrations fail
    } finally {
        await pool.end();
    }
}
