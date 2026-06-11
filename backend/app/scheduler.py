"""
scheduler.py — Daily background task for RENATHA
Checks for:
  1. Batches expiring in 30, 14, or 7 days  →  creates 'expiry' alerts
  2. Drugs where total stock <= reorder_level →  creates 'low_stock' alerts

Run automatically via APScheduler when the FastAPI server starts.
"""

from datetime import date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from . import models
from .database import SessionLocal
from .sms import send_sms
import logging

logger = logging.getLogger("renatha.scheduler")


def _get_admin_phones(db: Session) -> list[str]:
    """Return phone numbers of all admin and pharmacist users for SMS alerts."""
    users = (
        db.query(models.User)
        .filter(
            models.User.role.in_([models.RoleEnum.admin, models.RoleEnum.pharmacist]),
            models.User.phone.isnot(None),
        )
        .all()
    )
    return [u.phone for u in users if u.phone]



def check_expiry_and_low_stock():
    """Core logic — runs once per day."""
    db: Session = SessionLocal()
    try:
        logger.info("⏰ Running daily expiry and low-stock check...")
        _check_expiry(db)
        _check_low_stock(db)
        db.commit()
        logger.info("✅ Daily check complete.")
    except Exception as e:
        logger.error(f"❌ Scheduler error: {e}")
        db.rollback()
    finally:
        db.close()


def _check_expiry(db: Session):
    today = date.today()
    thresholds = [7, 14, 30]

    for days in thresholds:
        target_date = today + timedelta(days=days)
        batches = (
            db.query(models.Batch)
            .filter(
                models.Batch.quantity > 0,
                models.Batch.expiry_date == target_date,
            )
            .all()
        )
        for batch in batches:
            # Avoid duplicate alerts for same batch on same day
            existing = (
                db.query(models.Alert)
                .filter(
                    models.Alert.batch_id == batch.id,
                    models.Alert.type == models.AlertTypeEnum.expiry,
                    func.date(models.Alert.created_at) == today,
                )
                .first()
            )
            if not existing:
                msg = (
                    f"[RENATHA ALERT] Batch '{batch.batch_number}' expires in {days} day(s) "
                    f"on {batch.expiry_date}. Current stock: {batch.quantity} units."
                )
                alert = models.Alert(
                    drug_id=batch.drug_id,
                    batch_id=batch.id,
                    type=models.AlertTypeEnum.expiry,
                    message=msg,
                    status=models.AlertStatusEnum.unread,
                )
                db.add(alert)
                db.flush()  # Persist alert before SMS
                phones = _get_admin_phones(db)
                send_sms(phones, msg)
                logger.info(f"  ⚠️  Expiry alert created & SMS sent: Batch {batch.batch_number}, {days} days left.")


def _check_low_stock(db: Session):
    today = date.today()

    # Get total stock per drug across all batches
    stock_summary = (
        db.query(models.Batch.drug_id, func.sum(models.Batch.quantity).label("total_qty"))
        .group_by(models.Batch.drug_id)
        .all()
    )

    for drug_id, total_qty in stock_summary:
        drug = db.query(models.Drug).filter(models.Drug.id == drug_id, models.Drug.is_active == True).first()
        if not drug:
            continue

        if total_qty <= drug.reorder_level:
            # Avoid duplicate alerts today
            existing = (
                db.query(models.Alert)
                .filter(
                    models.Alert.drug_id == drug_id,
                    models.Alert.type == models.AlertTypeEnum.low_stock,
                    func.date(models.Alert.created_at) == today,
                )
                .first()
            )
            if not existing:
                msg = (
                    f"[RENATHA ALERT] Drug '{drug.name}' is running low. "
                    f"Total stock: {total_qty} {drug.unit}(s). "
                    f"Reorder level: {drug.reorder_level}. Please restock soon."
                )
                alert = models.Alert(
                    drug_id=drug_id,
                    batch_id=None,
                    type=models.AlertTypeEnum.low_stock,
                    message=msg,
                    status=models.AlertStatusEnum.unread,
                )
                db.add(alert)
                db.flush()  # Persist alert before SMS
                phones = _get_admin_phones(db)
                send_sms(phones, msg)
                logger.info(f"  📉 Low-stock alert created & SMS sent: {drug.name} ({total_qty} remaining).")
