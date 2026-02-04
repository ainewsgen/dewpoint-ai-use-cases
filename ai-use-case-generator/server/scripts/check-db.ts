
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config();

async function checkDb() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });

    try {
        console.log('Checking database tables...');
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);

        console.log('Tables found:');
        res.rows.forEach(row => console.log(` - ${row.table_name}`));

        const docCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'documents'
            );
        `);
        console.log(`\n'documents' table exists: ${docCheck.rows[0].exists}`);

    } catch (err) {
        console.error('Error checking DB:', err);
    } finally {
        await pool.end();
    }
}

checkDb();
