
import { pgTable, text, serial, timestamp, jsonb, boolean, integer, decimal, uniqueIndex, pgEnum } from 'drizzle-orm/pg-core';

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
    scannerSource: text('scanner_source'), // 'AI' | 'Heuristic'
    description: text('description'), // Business Summary
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

// DewPoint GTM Enums
export const icpTypeEnum = pgEnum('dewpoint_icp_type', ['dewpoint', 'internal']);
export const gtmMotionEnum = pgEnum('dewpoint_gtm_motion', ['outbound', 'content', 'community', 'partner']);
export const painCategoryEnum = pgEnum('dewpoint_pain_category', ['revenue_leakage', 'capacity_constraint', 'cost_overrun', 'compliance_risk', 'customer_experience', 'data_fragmentation']);
export const timeToValueEnum = pgEnum('dewpoint_time_to_value', ['<30_days', '30_60_days', '60_90_days', 'gt_90_days']);
export const buyingComplexityEnum = pgEnum('dewpoint_buying_complexity', ['single_decision_maker', 'dual_approval', 'committee_light', 'committee_heavy']);
export const budgetOwnershipEnum = pgEnum('dewpoint_budget_ownership', ['owner_discretionary', 'departmental', 'centralized_procurement']);
export const contentResonanceEnum = pgEnum('dewpoint_content_resonance', ['operator_story', 'peer_case_study', 'data_benchmark', 'contrarian_insight']);
export const readinessEnum = pgEnum('dewpoint_readiness', ['low', 'medium', 'high']);
export const toleranceEnum = pgEnum('dewpoint_tolerance', ['low', 'medium', 'high']);
export const referenceValueEnum = pgEnum('dewpoint_reference_value', ['low', 'medium', 'high']);
export const expansionPotentialEnum = pgEnum('dewpoint_expansion_potential', ['workflow_only', 'multi_workflow', 'platform_candidate']);

export const industryIcps = pgTable('industry_icps', {
    id: serial('id').primaryKey(),
    industry: text('industry').notNull(),
    perspective: text('perspective').default('Business Owner').notNull(),
    naicsCode: text('naics_code'),
    icpPersona: text('icp_persona').notNull(),
    promptInstructions: text('prompt_instructions').notNull(),

    // Extended ICP Spec (New)
    negativeIcps: text('negative_icps'),
    discoveryGuidance: text('discovery_guidance'),
    economicDrivers: text('economic_drivers'),

    // Schema v2: Specific B2B/B2C Fields
    communities: jsonb('communities'), // Array of { name, type, region }
    searchQueries: jsonb('search_queries'), // Array of { channel, query }
    linkedinAngles: jsonb('linkedin_angles'), // Array of strings
    techSignals: text('tech_signals').array(), // Array of strings
    keywords: jsonb('keywords'), // Dictionary of { pain: [], seo: [] }
    regulatoryRequirements: text('regulatory_requirements'),
    regionSpecificity: text('region_specificity').array(),
    buyerTitles: text('buyer_titles').array(),

    // DewPoint GTM Intelligence Fields
    icpType: icpTypeEnum('icp_type').default('dewpoint'),
    targetCompanyDescription: text('target_company_description'),
    employeeMin: integer('employee_min'),
    employeeMax: integer('employee_max'),
    revenueMinUsd: decimal('revenue_min_usd', { precision: 20, scale: 0 }),
    revenueMaxUsd: decimal('revenue_max_usd', { precision: 20, scale: 0 }),
    ownershipModel: text('ownership_model'),
    // buyerTitles: text('buyer_titles').array(), // REPLACED by Schema v2 version above
    // primaryRegion: text('primary_region').array(), // REPLACED by Schema v2 version above

    // Scoring (1-5)
    profitScore: integer('profit_score'),
    ltvScore: integer('ltv_score'),
    speedToCloseScore: integer('speed_to_close_score'),
    satisfactionScore: integer('satisfaction_score'),
    overallAttractiveness: decimal('overall_attractiveness', { precision: 4, scale: 2 }),

    // GTM Strategy
    gtmPrimary: gtmMotionEnum('gtm_primary'),
    gtmSecondary: gtmMotionEnum('gtm_secondary'),

    // Pain & Buying
    primaryPainCategory: painCategoryEnum('primary_pain_category'),
    timeToValue: timeToValueEnum('time_to_value'),
    buyingComplexity: buyingComplexityEnum('buying_complexity'),
    budgetOwnership: budgetOwnershipEnum('budget_ownership'),

    // Marketing
    contentResonanceType: contentResonanceEnum('content_resonance_type'),
    objectionProfile: text('objection_profile').array(),

    // Delivery & Success
    operationalReadiness: readinessEnum('operational_readiness'),
    changeTolerance: toleranceEnum('change_tolerance'),

    // Portfolio
    referenceValue: referenceValueEnum('reference_value'),
    expansionPotential: expansionPotentialEnum('expansion_potential'),

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
    data: jsonb('data'), // Full Opportunity/Recipe JSON
    isPublished: boolean('is_published').default(false),
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
    priority: integer('priority').default(0), // 0=Unassigned, 1=Primary, 2=Secondary
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

export const documents = pgTable('documents', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    type: text('type').notNull(), // 'Report' | 'Implementation Guide'
    content: text('content').notNull(), // Base64 Content
    fileName: text('file_name'),
    fileType: text('file_type'),
    isPublished: boolean('is_published').default(false),
    createdAt: timestamp('created_at').defaultNow(),
});
