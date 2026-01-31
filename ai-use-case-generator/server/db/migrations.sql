-- Migration to add authentication and enhanced integrations support
-- This runs on startup to ensure columns exist

-- Add authentication columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry timestamp;

-- Add credential columns to integrations table
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS user_id integer REFERENCES users(id);
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS auth_type text DEFAULT 'api_key';
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS base_url text;
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS api_key text;
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS api_secret text;
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS metadata jsonb;
