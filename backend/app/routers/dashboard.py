from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta
from .. import models
from ..auth import get_current_user
from ..database import get_db
from pydantic import BaseModel

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


class DashboardStats(BaseModel):
    total_active_drugs: int
    total_batches: int
    total_low_stock_drugs: int
    expiring_in_7_days: int
    expiring_in_14_days: int
    expiring_in_30_days: int
    total_sales_today: int
    unread_alerts: int


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    today = date.today()

    # Total active drugs
    total_active_drugs = db.query(models.Drug).filter(models.Drug.is_active == True).count()

    # Total batches with remaining stock
    total_batches = db.query(models.Batch).filter(models.Batch.quantity > 0).count()

    # Low stock: drugs where the SUM of all batch quantities <= reorder_level
    # We query drug IDs that are below their reorder level
    low_stock_subq = (
        db.query(models.Batch.drug_id, func.sum(models.Batch.quantity).label("total_qty"))
        .group_by(models.Batch.drug_id)
        .subquery()
    )
    total_low_stock_drugs = (
        db.query(models.Drug)
        .join(low_stock_subq, models.Drug.id == low_stock_subq.c.drug_id)
        .filter(
            models.Drug.is_active == True,
            low_stock_subq.c.total_qty <= models.Drug.reorder_level,
        )
        .count()
    )

    # Expiry windows
    expiring_in_7_days = (
        db.query(models.Batch)
        .filter(models.Batch.quantity > 0, models.Batch.expiry_date <= today + timedelta(days=7))
        .count()
    )
    expiring_in_14_days = (
        db.query(models.Batch)
        .filter(models.Batch.quantity > 0, models.Batch.expiry_date <= today + timedelta(days=14))
        .count()
    )
    expiring_in_30_days = (
        db.query(models.Batch)
        .filter(models.Batch.quantity > 0, models.Batch.expiry_date <= today + timedelta(days=30))
        .count()
    )

    # Sales today
    total_sales_today = (
        db.query(models.Sale)
        .filter(func.date(models.Sale.created_at) == today)
        .count()
    )

    # Unread alerts
    unread_alerts = (
        db.query(models.Alert)
        .filter(models.Alert.status == models.AlertStatusEnum.unread)
        .count()
    )

    return DashboardStats(
        total_active_drugs=total_active_drugs,
        total_batches=total_batches,
        total_low_stock_drugs=total_low_stock_drugs,
        expiring_in_7_days=expiring_in_7_days,
        expiring_in_14_days=expiring_in_14_days,
        expiring_in_30_days=expiring_in_30_days,
        total_sales_today=total_sales_today,
        unread_alerts=unread_alerts,
    )
