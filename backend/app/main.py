from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from apscheduler.schedulers.background import BackgroundScheduler
from . import models
from .database import engine
from .routers import auth, drugs, batches, sales, alerts, suppliers, dashboard, ussd, users
from .scheduler import check_expiry_and_low_stock
import logging

logging.basicConfig(level=logging.INFO)

# Create all tables (dev convenience — production uses Alembic)
models.Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start the daily alert scheduler on startup, shut it down on exit."""
    scheduler = BackgroundScheduler()
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

# ─── Global Error Handlers ──────────────────────────────────────────────────────

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Return a clean, consistent 422 response for invalid request bodies."""
    errors = []
    for error in exc.errors():
        errors.append({
            "field": " → ".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
            "type": error["type"],
        })
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"success": False, "detail": "Validation error", "errors": errors},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Catch-all handler for unexpected server errors."""
    logging.error(f"Unhandled error on {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"success": False, "detail": "An unexpected internal server error occurred."},
    )

# ─── CORS ──────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ───────────────────────────────────────────────────────────────────

app.include_router(auth.router,      prefix="/api")
app.include_router(users.router,     prefix="/api")
app.include_router(suppliers.router, prefix="/api")
app.include_router(drugs.router,     prefix="/api")
app.include_router(batches.router,   prefix="/api")
app.include_router(sales.router,     prefix="/api")
app.include_router(alerts.router,    prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(ussd.router,      prefix="/api")


@app.get("/", tags=["Health"])
def read_root():
    return {"status": "ok", "message": "Welcome to the RENATHA Pharmacy API"}
