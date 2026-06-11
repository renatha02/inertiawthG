from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from . import models
from .database import engine
from .routers import auth, drugs, batches, sales, alerts, suppliers, dashboard, ussd
from .scheduler import check_expiry_and_low_stock
import logging

logging.basicConfig(level=logging.INFO)

# Create all tables (dev convenience — production uses Alembic)
models.Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start the daily alert scheduler on startup, shut it down on exit."""
    scheduler = BackgroundScheduler()
    # Run daily at 07:00
    scheduler.add_job(check_expiry_and_low_stock, "cron", hour=7, minute=0)
    scheduler.start()
    logging.info("✅ Daily alert scheduler started (runs every day at 07:00).")
    yield
    scheduler.shutdown()
    logging.info("🛑 Scheduler shut down.")


app = FastAPI(
    title="RENATHA API",
    description="Pharmacy Inventory & Expiry Alert System — FastAPI Backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Configure CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routers
app.include_router(auth.router,      prefix="/api")
app.include_router(suppliers.router, prefix="/api")
app.include_router(drugs.router,     prefix="/api")
app.include_router(batches.router,   prefix="/api")
app.include_router(sales.router,     prefix="/api")
app.include_router(alerts.router,    prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(ussd.router,     prefix="/api")


@app.get("/", tags=["Health"])
def read_root():
    return {"status": "ok", "message": "Welcome to the RENATHA Pharmacy API"}
