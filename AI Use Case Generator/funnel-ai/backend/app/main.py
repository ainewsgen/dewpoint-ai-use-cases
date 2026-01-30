from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import leads, campaigns, pipeline, proposals, observability, notifications, users, brand, integrations, actions, ai, history, tasks, webhooks
from app.db.session import engine, Base, SessionLocal
from app.models.log import AccessLog
from app.models.lead_engine import Company, LeadRun, CrawlJob # Register models
from app.models.template import MessageTemplate # Ensure table is created
from app.models.notification import Notification # Ensure table is created
from app.models.subscription_history import SubscriptionHistory # Ensure table is created
from fastapi import Request
import time

# Create tables (for MVP, manual migration later)
Base.metadata.create_all(bind=engine)

# MVP: Manual migration to ensure new User columns exist
def run_migration(sql):
    try:
        with engine.connect() as conn:
            from sqlalchemy import text
            conn.execute(text(sql))
    except Exception:
        pass

# User table updates
run_migration("ALTER TABLE users ADD COLUMN usage_leads_weekly INTEGER DEFAULT 0")
run_migration("ALTER TABLE users ADD COLUMN usage_reset_at DATETIME DEFAULT CURRENT_TIMESTAMP")
run_migration("ALTER TABLE users ADD COLUMN hashed_password TEXT")
run_migration("ALTER TABLE users ADD COLUMN business_type TEXT DEFAULT 'b2b'")
run_migration("ALTER TABLE users ADD COLUMN email_opt_in BOOLEAN DEFAULT 1")

# Lead table updates (Lead Engine v2)
run_migration("ALTER TABLE leads ADD COLUMN company_id INTEGER REFERENCES companies(id)")
run_migration("ALTER TABLE leads ADD COLUMN bucket TEXT DEFAULT 'review'")
run_migration("ALTER TABLE leads ADD COLUMN last_enriched_at DATETIME")
run_migration("ALTER TABLE leads ADD COLUMN campaign_id INTEGER REFERENCES campaigns(id)")

app = FastAPI(title="$Funnel.ai API", version="0.1.0")

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    
    # Log to DB (Non-blocking ideally, but simple for MVP)
    # We skip OPTIONS requests to avoid noise
    if request.method != "OPTIONS":
        try:
            db = SessionLocal()
            log = AccessLog(
                method=request.method,
                path=request.url.path,
                status_code=response.status_code,
                duration_ms=process_time,
                ip_address=request.client.host
            )
            db.add(log)
            db.commit()
            db.close()
        except Exception:
            pass # Don't fail request if logging fails
            
    return response

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(leads.router, prefix="/api/leads", tags=["leads"])
app.include_router(campaigns.router, prefix="/api/campaigns", tags=["campaigns"])
app.include_router(pipeline.router, prefix="/api/pipeline", tags=["pipeline"])
app.include_router(proposals.router, prefix="/api/proposals", tags=["proposals"])
app.include_router(observability.router, prefix="/api/observability", tags=["observability"])
app.include_router(notifications.router, prefix="/api", tags=["notifications"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(brand.router, prefix="/api/brand", tags=["brand"])
app.include_router(integrations.router, prefix="/api/integrations", tags=["integrations"])
app.include_router(actions.router, prefix="/api/actions", tags=["actions"])
app.include_router(actions.router, prefix="/api/actions", tags=["actions"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
from app.api import auth
app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(history.router, prefix="/api/history", tags=["history"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
app.include_router(webhooks.router, prefix="/api/webhooks", tags=["webhooks"])

from app.api import lead_runs
app.include_router(lead_runs.router, prefix="/api/workspaces/{workspace_id}/lead-runs", tags=["lead-runs"])

from app.api import dashboard
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
from app.api import calendar
app.include_router(calendar.router, prefix="/api/calendar", tags=["calendar"])
# Register templates router
from app.api import templates
app.include_router(templates.router, prefix="/api/templates", tags=["templates"])
# Register scraper router
from app.api import scraper
app.include_router(scraper.router, prefix="/api/scraper", tags=["scraper"])

# Register plans router
from app.api import plans
from app.models.plan import Plan # Ensure model is registered
app.include_router(plans.router, prefix="/api/plans", tags=["plans"])

@app.get("/")
async def root():
    return {"message": "Welcome to $Funnel.ai API", "status": "online"}


@app.get("/health")
async def health_check():
    return {"status": "ok"}
