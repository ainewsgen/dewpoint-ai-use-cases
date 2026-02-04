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

-- 3. Integrations Table (Fixed duplicated SERIAL)
CREATE TABLE IF NOT EXISTS integrations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name TEXT NOT NULL,
    provider TEXT,
    auth_type TEXT DEFAULT 'api_key',
    base_url TEXT,
    api_key TEXT,
    api_secret TEXT,
    metadata JSONB,
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Companies Table
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    url TEXT,
    industry TEXT,
    naics_code TEXT,
    scanner_source TEXT,
    description TEXT,
    role TEXT,
    size TEXT,
    pain_point TEXT,
    stack JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. CMS Contents Table
CREATE TABLE IF NOT EXISTS cms_contents (
    id SERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    status TEXT DEFAULT 'draft',
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. Use Case Library Table
CREATE TABLE IF NOT EXISTS use_case_library (
    id SERIAL PRIMARY KEY,
    industry TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    roi_estimate TEXT,
    difficulty TEXT,
    tags JSONB,
    data JSONB,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 7. API Usage Table
CREATE TABLE IF NOT EXISTS api_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    shadow_id TEXT,
    model TEXT,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_cost DECIMAL(10, 6),
    timestamp TIMESTAMP DEFAULT NOW()
);

-- 8. Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    description TEXT,
    file_name TEXT,
    file_type TEXT,
    is_published BOOLEAN DEFAULT false,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 9. Industry ICPs Table
DO $$ BEGIN CREATE TYPE dewpoint_icp_type AS ENUM ('dewpoint', 'internal'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE dewpoint_gtm_motion AS ENUM ('outbound', 'content', 'community', 'partner'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE dewpoint_pain_category AS ENUM ('revenue_leakage', 'capacity_constraint', 'cost_overrun', 'compliance_risk', 'customer_experience', 'data_fragmentation'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE dewpoint_time_to_value AS ENUM ('<30_days', '30_60_days', '60_90_days', 'gt_90_days'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE dewpoint_buying_complexity AS ENUM ('single_decision_maker', 'dual_approval', 'committee_light', 'committee_heavy'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE dewpoint_budget_ownership AS ENUM ('owner_discretionary', 'departmental', 'centralized_procurement'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE dewpoint_content_resonance AS ENUM ('operator_story', 'peer_case_study', 'data_benchmark', 'contrarian_insight'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE dewpoint_readiness AS ENUM ('low', 'medium', 'high'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE dewpoint_tolerance AS ENUM ('low', 'medium', 'high'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE dewpoint_reference_value AS ENUM ('low', 'medium', 'high'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE dewpoint_expansion_potential AS ENUM ('workflow_only', 'multi_workflow', 'platform_candidate'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS industry_icps (
    id SERIAL PRIMARY KEY,
    industry TEXT NOT NULL,
    perspective TEXT DEFAULT 'Business Owner' NOT NULL,
    naics_code TEXT,
    icp_persona TEXT NOT NULL,
    prompt_instructions TEXT NOT NULL,
    negative_icps TEXT,
    discovery_guidance TEXT,
    economic_drivers TEXT,
    communities JSONB,
    search_queries JSONB,
    linkedin_angles JSONB,
    tech_signals TEXT[],
    keywords JSONB,
    regulatory_requirements TEXT,
    region_specificity TEXT[],
    buyer_titles TEXT[],
    icp_type dewpoint_icp_type DEFAULT 'dewpoint',
    target_company_description TEXT,
    employee_min INTEGER,
    employee_max INTEGER,
    revenue_min_usd DECIMAL(20, 0),
    revenue_max_usd DECIMAL(20, 0),
    ownership_model TEXT,
    profit_score INTEGER,
    ltv_score INTEGER,
    speed_to_close_score INTEGER,
    satisfaction_score INTEGER,
    overall_attractiveness DECIMAL(4, 2),
    gtm_primary dewpoint_gtm_motion,
    gtm_secondary dewpoint_gtm_motion,
    primary_pain_category dewpoint_pain_category,
    time_to_value dewpoint_time_to_value,
    buying_complexity dewpoint_buying_complexity,
    budget_ownership dewpoint_budget_ownership,
    content_resonance_type dewpoint_content_resonance,
    objection_profile TEXT[],
    operational_readiness dewpoint_readiness,
    change_tolerance dewpoint_tolerance,
    reference_value dewpoint_reference_value,
    expansion_potential dewpoint_expansion_potential,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(industry, perspective)
);

-- Schema Fixes for existing tables
ALTER TABLE leads ADD COLUMN IF NOT EXISTS shadow_id TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS fingerprint_hash TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0;
