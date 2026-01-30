
import { pgTable, text, serial, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    email: text('email').unique().notNull(),
    name: text('name'),
    role: text('role').default('user'), // 'user' | 'admin'
    createdAt: timestamp('created_at').defaultNow(),
});

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
    name: text('name').notNull(),
    enabled: boolean('enabled').default(true),
    createdAt: timestamp('created_at').defaultNow(),
});
