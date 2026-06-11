# RENATHA: Pharmacy Inventory & Expiry Alert System
## Master Development Plan

This development plan breaks down the construction of the RENATHA system into structured, actionable phases.

### Phase 1: Foundation & Backend Architecture (Week 1)
**Goal:** Establish the core database and secure API foundation.
*   **1.1 Environment Setup:**
    *   Initialize the Laravel 11 project.
    *   Configure `.env` for the MySQL database (`renatha_db`).
    *   Set up XAMPP/Local development server.
*   **1.2 Database Schema & Migrations:**
    *   Create migrations for `users`, `drugs`, `batches`, `sales`, and `alerts`.
    *   Define exact table relationships and foreign key constraints (e.g., `batch_id` cascades, `drug_id` links).
*   **1.3 Authentication Setup:**
    *   Install and configure Laravel Sanctum for API token management.
    *   Build the `AuthController` (`/register`, `/login`, `/logout`).
    *   Extend the `User` model to include `role` (admin, pharmacist, cashier) and `phone`.

### Phase 2: Core APIs & Frontend Scaffold (Week 2)
**Goal:** Build the CRUD endpoints and the basic React interface.
*   **2.1 REST API Development:**
    *   Create Eloquent Models with `$fillable` arrays and relationships.
    *   Build Resource Controllers for `DrugController`, `BatchController`, and `SaleController`.
    *   Define protected API routes in `routes/api.php`.
*   **2.2 React & Vite Scaffolding:**
    *   Initialize the React project using Vite.
    *   Install and configure Tailwind CSS and required libraries (React Router, Axios, Lucide Icons).
    *   Set up the folder structure (`api/`, `components/`, `pages/`, `layouts/`).
*   **2.3 API Integration:**
    *   Configure an Axios instance with base URL and JWT Token interceptors.
    *   Implement the Login interface and store tokens securely in `localStorage`.

### Phase 3: Inventory Management Module (Week 3)
**Goal:** Enable the addition, editing, and tracking of medical stock.
*   **3.1 Drug Management Interface:**
    *   Build the React page to list all drugs.
    *   Implement forms to add/edit drugs (Name, Category, Unit, Reorder Level).
*   **3.2 Batch & Expiry Management:**
    *   Build the interface to add stock batches linked to specific drugs.
    *   **Crucial Logic:** Ensure the exact `expiry_date` is captured upon entry.
    *   Implement UI indicators highlighting batches nearing expiration.

### Phase 4: Sales & Alert Mechanisms (Week 4)
**Goal:** Automate stock deduction and configure the backend alert engine.
*   **4.1 Point of Sale (POS) Interface:**
    *   Build a quick-sale React interface.
    *   **Crucial Logic:** Ensure the backend `SaleController` automatically deducts the `quantity_sold` from the correct batch, returning errors if stock is insufficient.
*   **4.2 Alert Engine (Backend):**
    *   Create a Laravel Scheduled Command (`alerts:check-expiry`) set to run daily.
    *   Implement logic to query for batches 30, 14, and 7 days from expiry.
    *   Implement logic to query for total drug stock <= `reorder_level`.
    *   Log these events to the `alerts` database table.

### Phase 5: Africa's Talking (Offline/USSD Module) (Week 5)
**Goal:** Ensure the system works without internet via SMS and basic phones.
*   **5.1 SMS Integration:**
    *   Install the Africa's Talking PHP SDK.
    *   Update the scheduled command to trigger SMS messages to `admin` and `pharmacist` roles when an alert is generated.
*   **5.2 USSD Controller:**
    *   Build the `/ussd` POST endpoint to receive Africa's Talking payloads.
    *   Design the USSD menu tree:
        *   `1. Check Stock`
        *   `2. View Alerts`
        *   `3. Record Sale`
    *   Implement the backend logic to parse USSD inputs and return continuous (`CON`) or ending (`END`) string responses.

### Phase 6: Dashboard, Polish & Deployment (Week 6)
**Goal:** Finalize the user experience, secure routes, and deploy to production.
*   **6.1 Analytics Dashboard:**
    *   Build a home dashboard with Recharts showing total stock value, expiring items count, and recent sales trends.
*   **6.2 Role-Based Access Control (RBAC):**
    *   Implement frontend route guards (e.g., Cashiers cannot access the system settings or delete drug records).
*   **6.3 Deployment:**
    *   Deploy the Laravel API and React build to a VPS (e.g., DigitalOcean).
    *   Configure Nginx as a reverse proxy.
    *   Secure the platform with SSL/TLS certificates.
