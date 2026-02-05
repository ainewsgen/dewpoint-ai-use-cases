# DewPoint AI Use Case Generator

**Live App:** https://dewpoint-strategy-app.onrender.com  
**Repository:** ainewsgen/dewpoint-ai-use-cases  
**Last Updated:** 2026-02-05

A full-stack lead generation tool that creates personalized AI automation "recipe cards" for businesses based on their industry, pain points, and tech stack.

---

## 🎯 What It Does

**For End Users:**
- Enter business pain point (e.g., "Manual invoice processing")
- Scan company website or manually enter context
- Get 5 AI-generated implementation blueprints
- Save favorites to personal roadmap (requires registration)
- **New: Export personalized AI Strategy Roadmap as PDF**

**For DewPoint (Admin):**
- Capture qualified leads with complete company profiles
- View saved recipes with admin-only insights (implementation difficulty, upsell opportunities)
- Track AI usage with **per-user spend analytics**
- Manage Use Case Library with **Draft Mode** (Mandatory Review)
- **New: Strategic Document Management** (Whitepapers, Guides, ROI Reports)
- **New: AI-Generated Content Summaries** (Automatic descriptions for resource uploads)
- **New: Resource Analytics** (Track document downloads per lead)
- **New: Professional PDF Export** (Generate high-impact roadmap documents)
- Configure AI providers and monitor system health

---

## 🛠️ Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL (Neon) via Drizzle ORM
- **AI:** OpenAI GPT-4o, Google Gemini (configurable)
- **Deployment:** Render (auto-deploy from `main` branch)
- **Auth:** JWT with bcrypt password hashing

---

## 🚀 Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, etc.

# Run development server
npm run dev
# Frontend: http://localhost:5173
# Backend: http://localhost:5000
```

### Build & Deploy

```bash
# Build (compiles TypeScript backend + Vite frontend)
npm run build

# Start production server
npm start
```

---

## 🔧 Environment Variables

Required in `.env`:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host/db

# Authentication
JWT_SECRET=your-secret-key

# AI Providers (Fallback - can also configure via Admin Dashboard)
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...

# Frontend (Vite)
VITE_API_URL=http://localhost:5000
```

---

## 📊 Key Features

### Anonymous AI Generation ✅
- Users can generate recipe cards without logging in
- Onboarding data persisted in localStorage
- Registration prompted when saving cards
- All data synced to backend after registration

### Complete Lead Capture ✅
- Company URL, industry, tech stack
- Job role, company size, pain point
- Saved recipe cards
- Timestamp and user metadata

### Admin Dashboard ✅

**4 Tabs:**

1. **Customer Interest/Leads**
   - View all registered users
   - Complete company profiles
   - Saved recipe cards with:
     - Public view (problem, solution, ROI)
     - Admin view (implementation difficulty, workflow steps, upsell opportunities)
   - Delete users/recipes

2. **Observability**
   - AI usage tracking (total requests, spend, budget)
   - **Spend By User** table (granular AI cost tracking)
   - System health checks
   - Diagnostic tools (dry run simulation)

3. **Integrations**
   - Configure OpenAI/Gemini API keys
   - Set daily budget limits
   - Test connections
   - Enable/disable providers

4. **Content Management / Library**
   - Manage announcements
   - **Draft Mode**: Imported use cases default to "Draft" status
   - Publish/Unpublish toggle for search visibility

5. **Resource Management (New)**
    - Upload Strategic Resources (Implementation Guides, ROI Reports)
    - **Draft vs. Published** status management
    - View **Download Analytics** for each resource
    - Automated AI descriptions for all uploads

### Budget Control ✅
- ✅ Set daily spending limit (default: $5.00)
- ✅ Hard limit blocks requests when exceeded
- ✅ Real-time spend tracking (Resets daily at midnight UTC)

### Usage Tracking ✅
- Logs all AI requests (authenticated + anonymous)
- Token usage and cost calculation
- Per-user analytics
- Admin dashboard metrics

---

## 🏗️ Architecture

### Database Schema

```
users → companies → leads
  ↓
integrations (AI providers)
  ↓
api_usage (tracking)
```

**Key Tables:**
- `users` - Authentication and user profiles
- `companies` - Company data from onboarding
- `leads` - Saved recipe cards per user
- `integrations` - AI provider configurations
- `api_usage` - Request logging and cost tracking
- `cms_contents` - Announcements and library content
- `documents` - Strategic resources (guides, reports) and download counts

### User Flow

```
Landing Page
    ↓
Enter Pain Point
    ↓
Business Context (URL scan or manual)
    ↓
AI Generates 5 Recipe Cards
    ↓
Click "Add to Roadmap"
    ↓
Register (if not logged in)
    ↓
All Data Saved to Backend
```

### AI Generation Flow

```
User Request
    ↓
Check Budget (daily limit)
    ↓
Fetch AI Integration (OpenAI/Gemini)
    ↓
Decrypt API Key
    ↓
Generate Blueprints (GPT-4o)
    ↓
Log Usage (tokens, cost)
    ↓
Return Recipe Cards
    ↓
Fallback to Templates (if AI fails)
```

---

## 🐛 Debugging

### Debug Endpoints

- **GET `/api/health`** - Uptime check
- **GET `/api/debug/schema-check`** - Verify database schema
- **POST `/api/admin/dry-run`** - Simulate full AI generation

### Common Issues

| Issue | Solution |
|-------|----------|
| "No active AI Provider found" | Add integration in Admin > Integrations |
| "Daily API budget exceeded" | Increase limit in Admin > Observability |
| "api_usage table not found" | Run "Fix DB Schema" in Observability tab |
| 400 error on `/api/generate` | Ensure `painPoint` is provided |

### Admin Panel Access

1. Login with admin credentials
2. Go to **Observability** tab
3. View real-time usage stats
4. Run diagnostic tools
5. Check integration status

---

## 📈 Current State (2026-02-04)

### Recent Improvements

- ✅ **Professional PDF Roadmap Export**: Integrated print-optimized strategy document generation.
- ✅ **Robust AI Usage Logging**: Enhanced observability with cost-precision tracking and anonymous `shadowId` capture.
- ✅ **Outcome-Based Taxonomy Sync**: Standardized AI prompts and fallback recipes with strategic naming (Sentinel, Catalyst, etc.).
- ✅ **Admin Dashboard Restoration**: Fixed structural JSX corruption and resolved narrowing/linting errors.
- ✅ **Per-Integration Budget Limits**: Implemented independent daily limit tracking and enforcement for multiple AI providers.
- ✅ **System Mode Prediction**: Real-time health diagnostic in the Observability tab (AI Live vs. System Fallback).
- ✅ **Observability API Alignment**: Resolved 404 errors by implementing missing endpoints (`/stats`) and correcting routing paths.
- ✅ **Strategic Document System**: Full management suite for Implementation Guides and Reports.
- ✅ **AI Content Generation**: Automatic description generation for uploaded resources via Gemini.
- ✅ **Download Analytics**: Tracking and reporting on lead engagement with strategic resources.
- ✅ **Mobile Polishing**: Optimized UI for tablets and smartphones (card grids, typography).
- ✅ **Frontend Accessibility**: Resolved invisible font issues in industry/tech inputs for light theme.
- ✅ **Global UI Spacing Fix**: Implemented a robust centralized layout wrapper to resolve navigation obstructions.
- ✅ **Per-User Usage Tracking**: Integrated spend analytics at the user level.
- ✅ **Library Draft Mode**: Implemented mandatory review for all new library content.
- ✅ **Production Hardening**: Removed emergency schema repair routes; tightened API security.
- ✅ Anonymous AI generation (no login required)
- ✅ Complete lead capture with company profiles
- ✅ Enhanced admin dashboard with full blueprint details

### Recent Commits

```
d37cfe8 - feat: track anonymous AI usage requests
d95dd80 - feat: expand blueprint details in admin dashboard
4b7fc3a - fix: remove role requirement from validation
b067374 - feat: save onboarding data after registration
31e586b - feat: enable anonymous AI generation
```

### Known Limitations

- Email system is placeholder only (password reset not functional)
- No CSV export for leads (PDF Roadmap for users implemented)
- No recipe editing for admin
- No advanced analytics per user

---

## 📚 Documentation

- **[PROJECT_CONTEXT.md](file:///Users/patchenuchiyama/.gemini/antigravity/brain/1c30ccb8-fd95-482e-998c-7b35267bbc50/PROJECT_CONTEXT.md)** - Comprehensive technical documentation
- **[QUICK_REFERENCE.md](file:///Users/patchenuchiyama/.gemini/antigravity/brain/1c30ccb8-fd95-482e-998c-7b35267bbc50/QUICK_REFERENCE.md)** - Quick onboarding prompt for AI assistants
- **[walkthrough.md](file:///Users/patchenuchiyama/.gemini/antigravity/brain/1c30ccb8-fd95-482e-998c-7b35267bbc50/walkthrough.md)** - Implementation walkthrough with screenshots

---

## 🚀 Future Enhancements

### High Priority
- Email integration (password reset, welcome emails)
- Analytics dashboard (conversion funnel, popular industries)
- Recipe customization (edit, save custom versions)

### Medium Priority
- Export functionality (CSV for leads, PDF for recipes)
- Advanced filtering (by industry, date range, company)
- Multi-language support

### Low Priority
- White-label support (custom branding)
- API access (REST API, webhooks)

---

## 🤝 Contributing

1. Create feature branch from `main`
2. Make changes with clear commit messages
3. Test locally with `npm run dev`
4. Push to GitHub (auto-deploys to Render)
5. Monitor deployment in Render dashboard

---

## 📞 Support

**Technical Issues:** Check Render logs  
**Database Issues:** Check Neon dashboard  
**AI Issues:** Check Observability tab in admin panel

**Admin Login:** admin@dewpoint.com  
**Default Budget:** $5.00/day

---

## 📝 License

Proprietary - DewPoint Group
 
