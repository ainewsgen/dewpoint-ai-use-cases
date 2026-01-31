
import { pgTable, text, serial, timestamp, jsonb, boolean, integer, decimal } from 'drizzle-orm/pg-core';

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
    userId: serial('user_id').references(() => users.id),
    url: text('url'),
    industry: text('industry'),
    role: text('role'), // User's role in company
    size: text('size'),
    painPoint: text('pain_point'),
    stack: jsonb('stack').$type<string[]>(), // Array of tech stack
    createdAt: timestamp('created_at').defaultNow(),
});

export const leads = pgTable('leads', {
    id: serial('id').primaryKey(),
    userId: serial('user_id').references(() => users.id),
    companyId: serial('company_id').references(() => companies.id),
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

export const integrations = pgTable('integrations', {
    id: serial('id').primaryKey(),
    userId: serial('user_id').references(() => users.id), // who configured it
    name: text('name').notNull(),
    provider: text('provider'), // Added to match DB schema
    authType: text('auth_type').default('api_key'), // 'api_key' | 'oauth' | 'basic'
    baseUrl: text('base_url'),
    apiKey: text('api_key'), // encrypted
    apiSecret: text('api_secret'), // encrypted  
    metadata: jsonb('metadata'), // additional config
    enabled: boolean('enabled').default(true),
    createdAt: timestamp('created_at').defaultNow(),
});

export const apiUsage = pgTable('api_usage', {
    id: serial('id').primaryKey(),
    userId: serial('user_id').references(() => users.id),
    model: text('model'),
    promptTokens: integer('prompt_tokens'),
    completionTokens: integer('completion_tokens'),
    totalCost: decimal('total_cost', { precision: 10, scale: 6 }), // stores up to $9999.999999
    timestamp: timestamp('timestamp').defaultNow(),
});
