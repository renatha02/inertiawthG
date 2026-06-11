from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from . import models
from .database import engine

# Create the database tables
# For production, we will use Alembic, but this ensures sqlite db is created instantly for dev
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="RENATHA API",
    description="Pharmacy Inventory & Expiry Alert System",
    version="1.0.0"
)

# Configure CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Update this to ["http://localhost:5173"] in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the RENATHA API"}
