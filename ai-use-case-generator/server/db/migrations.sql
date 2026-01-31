-- Migration to Initialize Database
-- This runs on startup to ensure tables exist

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user',
    password_hash TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    reset_token TEXT,
    reset_token_expiry TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Leads Table
CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    company_name TEXT,
    company_url TEXT,
    pain_point TEXT,
    employee_count TEXT,
    regions TEXT[],
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Integrations Table
CREATE TABLE IF NOT EXISTS integrations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    provider TEXT NOT NULL,
    api_key TEXT,
    api_secret TEXT,
    base_url TEXT,
    auth_type TEXT DEFAULT 'api_key',
    metadata JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
