# RENATHA Backend — Remaining Tasks

## ✅ Completed Core

- Auth (register, login, JWT, role guards)
- CRUD: drugs, batches, suppliers, users
- FIFO sales with batch allocation tracking
- Daily scheduler (expiry + low-stock alerts)
- SMS via Africa's Talking
- USSD menu
- Dashboard stats
- Alembic migrations
- Global error handlers, CORS
--- testing this out--- ---

## High Priority (implemented)

1. **Pagination** — All list endpoints return paginated results (`skip`/`limit` + total count).
2. **Search/Filter** — Query params on list endpoints (name search, date ranges, category filter).
3. **Stock Adjustments** — `POST /adjustments` for write-offs, corrections, damages.
4. **Sales Reporting** — Revenue by period, top-selling drugs, profit calculations.

---

## ✅ Medium Priority (implemented)

5. **Refresh tokens / logout** — Token refresh endpoint with rotation; logout revokes refresh token.
6. **Audit log** — `activity_log` table tracking CREATE/UPDATE/DELETE per user across all routers.
7. **Password reset flow** — `POST /auth/forgot-password` (sends SMS token) + `POST /auth/reset-password`.

## Minor / Nice-to-have

8. **CSV/Excel export** — Download endpoints for drugs, batches, sales, alerts.
9. **Email notifications** — Alerts via email (in addition to SMS).
10. **Purchase order workflow** — PO creation → receiving → batch creation.
11. **Image upload for drugs** — Product photos.
12. **Barcode/QR code support** — Scan to look up drugs/batches.
13. **Multi-currency support** — Selling price in different currencies.
14. **WebSocket real-time alerts** — Push new alerts to dashboard without polling.
15. **Rate limiting** — Protect login and USSD endpoints.
16. **API versioning** — Prefix v1 routes for future-proofing.
