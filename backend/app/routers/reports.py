from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from datetime import date, timedelta
from decimal import Decimal
from typing import List
from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db, engine

router = APIRouter(prefix="/reports", tags=["Reports"])


def _period_expr(period: str):
    """
    Return a SQL expression that groups a datetime column into the requested
    period bucket.  Works for both SQLite and MySQL/MariaDB.
    """
    dialect = engine.dialect.name  # 'sqlite' | 'mysql' | 'postgresql' …

    if period == "daily":
        return func.date(models.Sale.created_at)

    if period == "weekly":
        if dialect == "sqlite":
            # SQLite: ISO year-week  e.g. "2024-W03"
            return func.strftime("%Y-W%W", models.Sale.created_at)
        else:
            # MySQL / MariaDB
            return func.date_format(models.Sale.created_at, "%x-W%v")

    if period == "monthly":
        if dialect == "sqlite":
            return func.strftime("%Y-%m", models.Sale.created_at)
        else:
            return func.date_format(models.Sale.created_at, "%Y-%m")

    # fallback — daily
    return func.date(models.Sale.created_at)


@router.get("/revenue", response_model=List[schemas.RevenueReport])
def revenue_by_period(
    period: str = Query("daily", pattern="^(daily|weekly|monthly)$"),
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    """
    Revenue grouped by period (daily / weekly / monthly).
    Aggregation is performed in SQL — no Python-side accumulation.
    """
    cutoff = date.today() - timedelta(days=days)
    bucket = _period_expr(period)

    rows = (
        db.query(
            bucket.label("period"),
            func.sum(models.Sale.total_price).label("revenue"),
            func.count(models.Sale.id).label("num_sales"),
            func.sum(models.Sale.total_quantity).label("items_sold"),
        )
        .filter(func.date(models.Sale.created_at) >= cutoff)
        .group_by(bucket)
        .order_by(bucket.desc())
        .all()
    )

    return [
        schemas.RevenueReport(
            period=str(row.period),
            total_revenue=float(row.revenue or 0),
            total_sales=row.num_sales,
            total_items_sold=row.items_sold,
        )
        for row in rows
    ]


@router.get("/top-drugs", response_model=List[schemas.TopDrug])
def top_selling_drugs(
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    cutoff = date.today() - timedelta(days=days)
    results = (
        db.query(
            models.Drug.id,
            models.Drug.name,
            func.sum(models.Sale.total_quantity).label("total_qty"),
            func.sum(models.Sale.total_price).label("total_rev"),
        )
        .join(models.Sale, models.Sale.drug_id == models.Drug.id)
        .filter(func.date(models.Sale.created_at) >= cutoff)
        .group_by(models.Drug.id, models.Drug.name)
        .order_by(func.sum(models.Sale.total_quantity).desc())
        .limit(limit)
        .all()
    )
    return [
        schemas.TopDrug(drug_id=r.id, drug_name=r.name, total_quantity_sold=r.total_qty, total_revenue=float(r.total_rev))
        for r in results
    ]


@router.get("/profit", response_model=schemas.ProfitSummary)
def profit_summary(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    cutoff = date.today() - timedelta(days=days)

    revenue = (
        db.query(func.sum(models.Sale.total_price))
        .filter(func.date(models.Sale.created_at) >= cutoff)
        .scalar()
    )

    cost = (
        db.query(func.sum(models.Batch.buying_price * models.SaleBatchAllocation.quantity_deducted))
        .select_from(models.SaleBatchAllocation)
        .join(models.Sale, models.Sale.id == models.SaleBatchAllocation.sale_id)
        .join(models.Batch, models.Batch.id == models.SaleBatchAllocation.batch_id)
        .filter(func.date(models.Sale.created_at) >= cutoff)
        .scalar()
    )

    revenue = float(revenue or 0)
    cost = float(cost or 0)
    profit = revenue - cost
    margin = (profit / revenue * 100) if revenue > 0 else 0
    return schemas.ProfitSummary(
        total_revenue=revenue,
        total_cost=cost,
        total_profit=profit,
        margin_percent=round(margin, 2),
    )
