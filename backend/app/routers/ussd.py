"""
ussd.py — Africa's Talking USSD Controller for RENATHA

Shortcode: *384# (configure in AT dashboard)
Africa's Talking sends a POST request to /api/ussd on every user interaction.

Menu Tree:
    Welcome to RENATHA
    1. Check Stock
    2. View Active Alerts
    3. Record Quick Sale

Response prefix:
    CON → continues the USSD session (more input expected)
    END → terminates the session
"""

from fastapi import APIRouter, Form, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from .. import models
from ..database import get_db

router = APIRouter(prefix="/ussd", tags=["USSD"])


@router.post("/")
async def ussd_handler(
    sessionId: str = Form(...),
    serviceCode: str = Form(...),
    phoneNumber: str = Form(...),
    text: str = Form(""),
    db: Session = Depends(get_db),
):
    """
    Handle incoming USSD requests from Africa's Talking.
    `text` is the accumulated input e.g. "1*2" means user picked 1 then 2.
    """
    levels = [t for t in text.strip().split("*") if t] if text.strip() else []

    response = _route(levels, phoneNumber, db)
    return _plain_response(response)


def _route(levels: list[str], phone: str, db: Session) -> str:
    """Route to the correct menu based on accumulated input levels."""

    # ── Level 0: Main Menu ──────────────────────────────────────────────────
    if not levels:
        return (
            "CON Welcome to RENATHA Pharmacy\n"
            "1. Check Stock\n"
            "2. View Active Alerts\n"
            "3. Record Quick Sale"
        )

    # ── Level 1: Main choices ───────────────────────────────────────────────
    if len(levels) == 1:
        choice = levels[0]

        if choice == "1":
            # Show list of active drugs with stock
            return _check_stock_menu(db)

        elif choice == "2":
            # Show latest unread alerts (max 3)
            return _view_alerts(db)

        elif choice == "3":
            # Start the quick-sale flow: show drug list
            return _sale_drug_menu(db)

        else:
            return "END Invalid option. Please try again."

    # ── Level 2: Sub-choices ────────────────────────────────────────────────
    if len(levels) == 2:
        parent, sub = levels[0], levels[1]

        if parent == "1":
            # User selected a drug number — show its total stock
            return _check_stock_detail(sub, db)

        elif parent == "3":
            # User selected drug for sale — ask for quantity
            drug = _get_drug_by_index(sub, db)
            if not drug:
                return "END Invalid drug selection."
            return f"CON Enter quantity to sell for:\n{drug.name} ({drug.unit})"

    # ── Level 3: Quantity entry for sale ────────────────────────────────────
    if len(levels) == 3 and levels[0] == "3":
        drug = _get_drug_by_index(levels[1], db)
        if not drug:
            return "END Invalid drug selection."
        try:
            qty = int(levels[2])
        except ValueError:
            return "END Invalid quantity. Please enter a number."
        return _record_sale(drug, qty, db)

    return "END Invalid input. Please try again."


# ─── Menu Helpers ────────────────────────────────────────────────────────────────

def _get_active_drugs(db: Session):
    return db.query(models.Drug).filter(models.Drug.is_active == True).limit(8).all()


def _get_drug_by_index(index_str: str, db: Session):
    try:
        idx = int(index_str) - 1
        drugs = _get_active_drugs(db)
        if 0 <= idx < len(drugs):
            return drugs[idx]
    except (ValueError, IndexError):
        pass
    return None


def _check_stock_menu(db: Session) -> str:
    drugs = _get_active_drugs(db)
    if not drugs:
        return "END No drugs found in system."
    lines = ["CON Select a drug to check stock:"]
    for i, drug in enumerate(drugs, start=1):
        lines.append(f"{i}. {drug.name}")
    return "\n".join(lines)


def _check_stock_detail(index_str: str, db: Session) -> str:
    drug = _get_drug_by_index(index_str, db)
    if not drug:
        return "END Invalid selection."
    total_stock = (
        db.query(func.sum(models.Batch.quantity))
        .filter(models.Batch.drug_id == drug.id)
        .scalar() or 0
    )
    status = "⚠ LOW" if total_stock <= drug.reorder_level else "OK"
    return (
        f"END {drug.name}\n"
        f"Stock: {total_stock} {drug.unit}(s)\n"
        f"Reorder Level: {drug.reorder_level}\n"
        f"Status: {status}"
    )


def _view_alerts(db: Session) -> str:
    alerts = (
        db.query(models.Alert)
        .filter(models.Alert.status == models.AlertStatusEnum.unread)
        .order_by(models.Alert.created_at.desc())
        .limit(3)
        .all()
    )
    if not alerts:
        return "END No active alerts. All good!"
    lines = [f"END You have {len(alerts)} alert(s):"]
    for i, alert in enumerate(alerts, start=1):
        # Truncate message to fit USSD screen limits (182 chars total)
        short = alert.message[:60] + "..." if len(alert.message) > 60 else alert.message
        lines.append(f"{i}. [{alert.type.value.upper()}] {short}")
    return "\n".join(lines)


def _sale_drug_menu(db: Session) -> str:
    drugs = _get_active_drugs(db)
    if not drugs:
        return "END No drugs available for sale."
    lines = ["CON Select drug to sell:"]
    for i, drug in enumerate(drugs, start=1):
        lines.append(f"{i}. {drug.name}")
    return "\n".join(lines)


def _record_sale(drug: models.Drug, qty: int, db: Session) -> str:
    """Perform FIFO deduction and record the sale."""
    batches = (
        db.query(models.Batch)
        .filter(models.Batch.drug_id == drug.id, models.Batch.quantity > 0)
        .order_by(models.Batch.expiry_date.asc())
        .all()
    )
    total_available = sum(b.quantity for b in batches)
    if total_available < qty:
        return f"END Insufficient stock for {drug.name}.\nAvailable: {total_available} {drug.unit}(s)."

    # FIFO deduction
    from decimal import Decimal
    remaining = qty
    total_price = Decimal("0.00")
    allocations = []

    for batch in batches:
        if remaining <= 0:
            break
        deduct = min(remaining, batch.quantity)
        batch.quantity -= deduct
        remaining -= deduct
        total_price += Decimal(str(batch.selling_price)) * deduct
        allocations.append({"batch": batch, "deducted": deduct})

    # Create sale record under a "USSD" system user if no real user context
    # Use the first admin as the recorder
    admin = db.query(models.User).filter(models.User.role == models.RoleEnum.admin).first()
    if not admin:
        return "END Sale failed: no admin user configured."

    sale = models.Sale(
        user_id=admin.id,
        drug_id=drug.id,
        total_quantity=qty,
        total_price=total_price,
    )
    db.add(sale)
    db.flush()

    for alloc in allocations:
        db.add(models.SaleBatchAllocation(
            sale_id=sale.id,
            batch_id=alloc["batch"].id,
            quantity_deducted=alloc["deducted"],
        ))

    db.commit()
    return (
        f"END Sale recorded!\n"
        f"Drug: {drug.name}\n"
        f"Qty: {qty} {drug.unit}(s)\n"
        f"Total: KES {total_price:.2f}"
    )


def _plain_response(text: str):
    """Return a plain text response as required by Africa's Talking USSD API."""
    from fastapi.responses import PlainTextResponse
    return PlainTextResponse(content=text, media_type="text/plain")
