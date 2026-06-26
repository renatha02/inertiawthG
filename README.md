# RENATHA Pharmacy Inventory & Alert System

## Project Overview

`RENATHA` is a full-stack pharmacy inventory management system built as a two-part application:

- **Backend:** FastAPI + SQLAlchemy + Alembic
- **Frontend:** React + Vite

The system is designed to manage drug products, inventory batches, supplier relationships, sales transactions, and automated expiry/low-stock alerts. It also supports USSD-style simulation and SMS alert preview functionality.

## Architecture

### Backend

The backend is implemented using FastAPI, exposing a RESTful API under `/api`. It includes:

- Authentication and user management
- Drug product management
- Inventory batch management
- Sales recording with FIFO batch deduction
- Supplier management
- Expiry and low-stock alert generation
- USSD endpoint support and simulator integration
- Dashboard statistics aggregation
- Audit/logging of operations

Key backend files:

- `backend/app/main.py` — FastAPI application setup, CORS, lifecycle scheduler, error handling, router registration
- `backend/app/database.py` — SQLAlchemy engine and session setup, with SQLite fallback
- `backend/app/schemas.py` — Pydantic schemas for request/response validation
- `backend/app/models.py` — SQLAlchemy ORM models
- `backend/app/routers/*.py` — route definitions for each domain area
- `backend/alembic/` — migration configuration and versions

### Frontend

The frontend is a modern React single-page application served by Vite. It provides:

- Login screen and token-based authentication
- Dashboard with status cards and alert counts
- Inventory list and batch CRUD operations
- Sales entry and transaction history
- USSD emulator and SMS log preview

Key frontend files:

- `frontend/src/App.jsx` — main app state, login flow, data loading, and route/tab rendering
- `frontend/src/api.js` — API wrapper for backend requests and auth token handling
- `frontend/src/components/*` — UI components for dashboard, inventory, sales, USSD simulator, SMS log, navigation, and login
- `frontend/src/index.css` — styling for the app and phone simulator

## Features

### Backend Features

- JWT authentication with login, refresh, logout, and current user endpoints
- Role-based guard logic for admin and pharmacist rights
- Product catalog management (`/api/drugs`)
- Inventory batch lifecycle management (`/api/batches`)
- Sales creation with FIFO batch depletion (`/api/sales`)
- Supplier lookup and filtering (`/api/suppliers`)
- Alert retrieval, status handling, and unread counts (`/api/alerts`)
- Dashboard statistics endpoint (`/api/dashboard/stats`)
- USSD and simulation endpoints (`/api/ussd`)
- Adjustment, report, and audit logging routers
- Background scheduler for expiry/low-stock checks using APScheduler
- SMS alert integration via Africa's Talking SDK

### Frontend Features

- Reactive login with backend auth flow
- Persistent JWT storage in `localStorage`
- Centralized data loading and refresh from the backend
- Batch create/update/delete flows connected to backend API
- Sales recording that posts to `/api/sales`
- Inventory alerts and expiry awareness in dashboard
- Offline-style USSD phone simulator and integrated SMS log preview

## Installation

### Prerequisites

- Python 3.10+ or newer
- Node.js 20+ (LTS recommended)
- Git

### Backend Setup

From the project root:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

This starts the backend on `http://127.0.0.1:8000` by default.

#### Environment Variables

The backend loads `.env` values via `dotenv`. The most important setting is:

- `DATABASE_URL` — if not set, the backend falls back to `sqlite:///./renatha.db`

### Frontend Setup

Open another terminal and run:

```bash
cd frontend
npm install
npm run dev
```

The Vite app typically opens at `http://localhost:5173`.

## Running the Application

1. Start the backend server.
2. Start the frontend server.
3. Open the frontend URL in your browser.
4. Login with a seeded user or register the first user via `/api/auth/register` (first user becomes initial admin).

## API Summary

### Authentication

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/register`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/change-password`

### Drugs

- `GET /api/drugs`
- `GET /api/drugs/{drug_id}`
- `POST /api/drugs`
- `PUT /api/drugs/{drug_id}`
- `DELETE /api/drugs/{drug_id}`

### Batches

- `GET /api/batches`
- `GET /api/batches/{batch_id}`
- `POST /api/batches`
- `PUT /api/batches/{batch_id}`
- `DELETE /api/batches/{batch_id}`

### Sales

- `GET /api/sales`
- `GET /api/sales/{sale_id}`
- `POST /api/sales`

### Dashboard

- `GET /api/dashboard/stats`

### Alerts, Suppliers, Users, Adjustments, Reports, Logs, USSD

The backend also includes rich support routers for:

- `/api/alerts`
- `/api/suppliers`
- `/api/users`
- `/api/adjustments`
- `/api/reports`
- `/api/logs`
- `/api/ussd`

These provide lookup, audit, reporting, and system-level behavior for expiry and USSD transaction flows.

## Important Notes

- The project is split into a separate backend and frontend workspace.
- `backend/app/main.py` configures CORS to allow the common local frontend origins.
- The backend scheduler runs expiry and low-stock checks daily at 07:00 and creates alerts automatically.
- The frontend stores JWT tokens in `localStorage` and uses `Authorization: Bearer <token>` for API calls.
- `frontend/src/api.js` wraps network requests and centralizes auth header injection.

## Folder Structure

```
backend/
  app/
    main.py
    database.py
    models.py
    schemas.py
    routers/
      auth.py
      drugs.py
      batches.py
      sales.py
      alerts.py
      suppliers.py
      dashboard.py
      ussd.py
      users.py
      adjustments.py
      reports.py
      logs.py
    scheduler.py
    sms.py
    auth.py
    audit.py
  alembic.ini
  alembic/
    versions/
      7790012f3029_initial_schema.py

docs/
  backend_todo.md
  development_plan.md
  project setup and installation/
    project_setup_and_installation.md
frontend/
  package.json
  vite.config.js
  src/
    App.jsx
    api.js
    components/
      Dashboard.jsx
      InventoryList.jsx
      Navbar.jsx
      SalesManager.jsx
      SmsLog.jsx
      UssdSimulator.jsx
      Login.jsx
    index.css
```

## Future Improvements

Potential next steps include:

- adding role-aware UI screens for admins and pharmacists
- expanding frontend routing with React Router
- building complete supplier and report management pages
- adding unit tests and end-to-end test coverage
- enabling production build deployment and CI/CD

## Contact

This README covers the current structure of the RENATHA project in the workspace `inertiawthG`. Use the backend API docs at `http://127.0.0.1:8000/docs` for the latest endpoint contract.
