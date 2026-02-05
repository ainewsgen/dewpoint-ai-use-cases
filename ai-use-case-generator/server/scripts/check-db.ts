
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
            SELECT id, name, is_published, type 
            FROM documents
            ORDER BY created_at DESC;
        `);
        console.log(`\nDocuments in DB (${docCheck.rows.length}):`);
        docCheck.rows.forEach(row => {
            console.log(` - [${row.is_published ? 'PUBLISHED' : 'DRAFT'}] ${row.name} (${row.type})`);
        });

        const publishedCount = docCheck.rows.filter(r => r.is_published).length;
        console.log(`\nTotal Published: ${publishedCount}`);

    } catch (err) {
        console.error('Error checking DB:', err);
    } finally {
        await pool.end();
    }
}

checkDb();
