
import { pgTable, text, serial, timestamp, jsonb, boolean, integer, decimal, uniqueIndex } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    email: text('email').unique().notNull(),
    name: text('name'),
    passwordHash: text('password_hash'), // bcrypt hashed password
    role: text('role').default('user'), // 'user' | 'admin'
    isActive: boolean('is_active').default(true), // for soft delete
    lastLogin: timestamp('last_login'),
    resetToken: text('reset_token'),
    resetTokenExpiry: timestamp('reset_token_expiry'),
    createdAt: timestamp('created_at').defaultNow(),
});

// ... (other tables remain unchanged, just showing imports updated above)



export const companies = pgTable('companies', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id), // FK should be integer
    url: text('url'),
    industry: text('industry'),
    naicsCode: text('naics_code'), // NEW: for standard industry classification
    role: text('role'), // User's role in company
    size: text('size'),
    painPoint: text('pain_point'),
    stack: jsonb('stack').$type<string[]>(), // Array of tech stack
    createdAt: timestamp('created_at').defaultNow(),
});

export const leads = pgTable('leads', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id), // FK should be integer
    companyId: integer('company_id').references(() => companies.id), // FK should be integer
    shadowId: text('shadow_id'), // NEW: for anonymous tracking
    fingerprintHash: text('fingerprint_hash'), // NEW: browser fingerprint
    recipes: jsonb('recipes').notNull(), // The generated opportunities
    createdAt: timestamp('created_at').defaultNow(),
});

export const cmsContents = pgTable('cms_contents', {
    id: serial('id').primaryKey(),
    key: text('key').unique().notNull(), // e.g. 'dpg_announcement'
    value: text('value'),
    status: text('status').default('draft'), // 'draft' | 'published'
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const industryIcps = pgTable('industry_icps', {
    id: serial('id').primaryKey(),
    industry: text('industry').notNull(), // Removed unique() to allow variants
    perspective: text('perspective').default('Business Owner').notNull(), // New column
    naicsCode: text('naics_code'),
    icpPersona: text('icp_persona').notNull(), // e.g. "Plant Manager" or "Segment Name"
    promptInstructions: text('prompt_instructions').notNull(), // The main AI directive

    // Extended ICP Spec (New)
    negativeIcps: text('negative_icps'), // Who to avoid
    discoveryGuidance: text('discovery_guidance'), // Where to find them
    economicDrivers: text('economic_drivers'), // Why they are valuable

    createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
    // unique constraint on industry + perspective
    unq: uniqueIndex('industry_perspective_idx').on(t.industry, t.perspective),
}));

export const useCaseLibrary = pgTable('use_case_library', {
    id: serial('id').primaryKey(),
    industry: text('industry').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    roiEstimate: text('roi_estimate'),
    difficulty: text('difficulty'), // 'Low' | 'Med' | 'High'
    tags: jsonb('tags').$type<string[]>(),
    createdAt: timestamp('created_at').defaultNow(),
});

export const integrations = pgTable('integrations', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id), // who configured it - FK integer
    name: text('name').notNull(),
    provider: text('provider'), // Added to match DB schema
    authType: text('auth_type').default('api_key'), // 'api_key' | 'oauth' | 'basic'
    baseUrl: text('base_url'),
    apiKey: text('api_key'), // encrypted
    apiSecret: text('api_secret'), // encrypted  
    metadata: jsonb('metadata'), // additional config
    enabled: boolean('is_active').default(true), // Mapped to is_active checking
    createdAt: timestamp('created_at').defaultNow(),
});

export const apiUsage = pgTable('api_usage', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id), // Allow null for anonymous users
    shadowId: text('shadow_id'), // NEW: track usage for shadow users too
    model: text('model'),
    promptTokens: integer('prompt_tokens'),
    completionTokens: integer('completion_tokens'),
    totalCost: decimal('total_cost', { precision: 10, scale: 6 }), // stores up to $9999.999999
    timestamp: timestamp('timestamp').defaultNow(),
});
