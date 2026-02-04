import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.warn('⚠️ DATABASE_URL is not set. Using dummy connection string to prevent crash.');
}

const pool = new Pool({
    connectionString: connectionString || 'postgres://dummy:dummy@localhost:5432/dummy',
    ssl: (connectionString?.includes('neon.tech') || connectionString?.includes('render.com') || process.env.NODE_ENV === 'production')
        ? { rejectUnauthorized: false }
        : undefined
});

export const db = drizzle(pool, { schema });
