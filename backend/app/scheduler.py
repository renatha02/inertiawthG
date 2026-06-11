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
import logging

logger = logging.getLogger("renatha.scheduler")


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
                alert = models.Alert(
                    drug_id=batch.drug_id,
                    batch_id=batch.id,
                    type=models.AlertTypeEnum.expiry,
                    message=(
                        f"Batch '{batch.batch_number}' for drug ID {batch.drug_id} "
                        f"expires in {days} day(s) on {batch.expiry_date}. "
                        f"Current stock: {batch.quantity} units."
                    ),
                    status=models.AlertStatusEnum.unread,
                )
                db.add(alert)
                logger.info(f"  ⚠️  Expiry alert created: Batch {batch.batch_number}, {days} days left.")


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
                alert = models.Alert(
                    drug_id=drug_id,
                    batch_id=None,
                    type=models.AlertTypeEnum.low_stock,
                    message=(
                        f"Drug '{drug.name}' is running low. "
                        f"Total stock: {total_qty} {drug.unit}(s). "
                        f"Reorder level: {drug.reorder_level}."
                    ),
                    status=models.AlertStatusEnum.unread,
                )
                db.add(alert)
                logger.info(f"  📉 Low-stock alert created: {drug.name} ({total_qty} remaining).")
