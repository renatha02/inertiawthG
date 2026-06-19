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

---

## High Priority (implemented)

1. **Pagination** — All list endpoints return paginated results (`skip`/`limit` + total count).
2. **Search/Filter** — Query params on list endpoints (name search, date ranges, category filter).
3. **Stock Adjustments** — `POST /adjustments` for write-offs, corrections, damages.
4. **Sales Reporting** — Revenue by period, top-selling drugs, profit calculations.

---

## Medium Priority

5. **Refresh tokens / logout** — Implement token refresh endpoint and server-side blacklist/revocation.
6. **Audit log** — `activity_log` table tracking create/update/delete actions per user.
7. **Password reset flow** — Forgot password → email token → reset endpoint.

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
