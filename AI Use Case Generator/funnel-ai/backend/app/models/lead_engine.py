from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from ..db.session import Base

# Enums
class LeadRunStatus(str, enum.Enum):
    queued = "queued"
    running = "running"
    completed = "completed"
    failed = "failed"

class LeadStatus(str, enum.Enum):
    active = "active"
    archived = "archived"

class ContactType(str, enum.Enum):
    email = "email"
    phone = "phone"
    contact_form = "contact_form"

class CrawlStatus(str, enum.Enum):
    queued = "queued"
    running = "running"
    completed = "completed"
    failed = "failed"
    skipped = "skipped"

class ActionStatus(str, enum.Enum):
    queued = "queued"
    running = "running"
    completed = "completed"
    failed = "failed"

# Models

class Tenant(Base):
    __tablename__ = "tenants"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Workspace(Base):
    __tablename__ = "workspaces"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class WorkspacePreset(Base):
    __tablename__ = "workspace_presets"
    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    config_blob = Column(JSON, nullable=False)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class LeadRun(Base):
    __tablename__ = "lead_runs"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    preset_id = Column(Integer, ForeignKey("workspace_presets.id", ondelete="SET NULL"), nullable=True)
    config_blob = Column(JSON, nullable=False)
    status = Column(String, default=LeadRunStatus.queued.value)
    created_by_user_id = Column(String, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)
    stats = Column(JSON, default={})
    error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Company(Base):
    __tablename__ = "companies"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False, index=True) # Index for fuzzy search (simulated)
    domain = Column(String, nullable=True, index=True)
    domain_root = Column(String, nullable=True)
    website_url = Column(Text, nullable=True)
    primary_phone = Column(String, nullable=True)
    primary_city = Column(String, nullable=True)
    primary_state = Column(String, nullable=True)
    primary_country = Column(String, default='US')
    categories = Column(JSON, default=[]) # Array of strings in JSON
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())



class LeadRunItem(Base):
    __tablename__ = "lead_run_items"
    id = Column(Integer, primary_key=True, index=True)
    lead_run_id = Column(Integer, ForeignKey("lead_runs.id", ondelete="CASCADE"), nullable=False)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="CASCADE"), nullable=False)
    source_type = Column(String, nullable=True)
    source_url = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class CompanyContact(Base):
    __tablename__ = "company_contacts"
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=False) # email, phone, contact_form
    value = Column(String, nullable=False)
    label = Column(String, nullable=True)
    source_url = Column(Text, nullable=True)
    source_type = Column(String, nullable=True)
    confidence = Column(Integer, default=70)
    first_seen_at = Column(DateTime(timezone=True), server_default=func.now())
    last_seen_at = Column(DateTime(timezone=True), server_default=func.now())

class Source(Base):
    __tablename__ = "sources"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="SET NULL"), nullable=True)
    lead_run_id = Column(Integer, ForeignKey("lead_runs.id", ondelete="SET NULL"), nullable=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="SET NULL"), nullable=True)
    source_type = Column(String, nullable=False)
    source_url = Column(Text, nullable=False)
    external_id = Column(String, nullable=True)
    payload = Column(JSON, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class IntentSignal(Base):
    __tablename__ = "intent_signals"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="SET NULL"), nullable=True)
    lead_run_id = Column(Integer, ForeignKey("lead_runs.id", ondelete="SET NULL"), nullable=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="SET NULL"), nullable=True)
    source_type = Column(String, nullable=False)
    source_url = Column(Text, nullable=False)
    job_title = Column(String, nullable=True)
    job_location = Column(String, nullable=True)
    posted_date = Column(DateTime(timezone=True), nullable=True) # Using DateTime for simplicity
    matched_skills = Column(JSON, default=[])
    matched_titles = Column(JSON, default=[])
    payload = Column(JSON, default={})
    first_seen_at = Column(DateTime(timezone=True), server_default=func.now())
    last_seen_at = Column(DateTime(timezone=True), server_default=func.now())

class CrawlJob(Base):
    __tablename__ = "crawl_jobs"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="SET NULL"), nullable=True)
    lead_run_id = Column(Integer, ForeignKey("lead_runs.id", ondelete="SET NULL"), nullable=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="SET NULL"), nullable=True)
    domain_root = Column(String, nullable=False)
    requested_url = Column(Text, nullable=True)
    status = Column(String, default=CrawlStatus.queued.value)
    priority = Column(Integer, default=50)
    attempt_count = Column(Integer, default=0)
    last_crawled_at = Column(DateTime(timezone=True), nullable=True)
    next_crawl_at = Column(DateTime(timezone=True), nullable=True)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class CrawlPage(Base):
    __tablename__ = "crawl_pages"
    id = Column(Integer, primary_key=True, index=True)
    crawl_job_id = Column(Integer, ForeignKey("crawl_jobs.id", ondelete="CASCADE"), nullable=False)
    url = Column(Text, nullable=False)
    http_status = Column(Integer, nullable=True)
    fetched_at = Column(DateTime(timezone=True), server_default=func.now())
    content_type = Column(String, nullable=True)
    content_hash = Column(String, nullable=True)
    extracted = Column(JSON, default={})

class WorkspaceAction(Base):
    __tablename__ = "workspace_actions"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    action_type = Column(String, nullable=False)
    status = Column(String, default=ActionStatus.queued.value)
    requested_by_user_id = Column(String, nullable=True)
    payload = Column(JSON, default={})
    progress = Column(JSON, default={})
    error = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
