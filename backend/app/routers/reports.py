from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta
from decimal import Decimal
from typing import List
from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/revenue", response_model=List[schemas.RevenueReport])
def revenue_by_period(
    period: str = Query("daily", pattern="^(daily|weekly|monthly)$"),
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    cutoff = date.today() - timedelta(days=days)
    sales = (
        db.query(
            func.date(models.Sale.created_at).label("day"),
            func.sum(models.Sale.total_price).label("revenue"),
            func.count(models.Sale.id).label("num_sales"),
            func.sum(models.Sale.total_quantity).label("items_sold"),
        )
        .filter(func.date(models.Sale.created_at) >= cutoff)
        .group_by(func.date(models.Sale.created_at))
        .order_by(func.date(models.Sale.created_at).desc())
        .all()
    )

    if period == "weekly":
        return _aggregate_weekly(sales)
    elif period == "monthly":
        return _aggregate_monthly(sales)
    return [
        schemas.RevenueReport(
            period=str(row.day),
            total_revenue=float(row.revenue),
            total_sales=row.num_sales,
            total_items_sold=row.items_sold,
        )
        for row in sales
    ]


def _aggregate_weekly(sales):
    from collections import defaultdict
    weeks = defaultdict(lambda: {"revenue": Decimal("0"), "sales": 0, "items": 0})
    for row in sales:
        wk = row.day.isocalendar()
        key = f"{wk[0]}-W{wk[1]:02d}"
        weeks[key]["revenue"] += row.revenue
        weeks[key]["sales"] += row.num_sales
        weeks[key]["items"] += row.items_sold
    return [
        schemas.RevenueReport(period=k, total_revenue=float(v["revenue"]), total_sales=v["sales"], total_items_sold=v["items"])
        for k, v in sorted(weeks.items(), reverse=True)
    ]


def _aggregate_monthly(sales):
    from collections import defaultdict
    months = defaultdict(lambda: {"revenue": Decimal("0"), "sales": 0, "items": 0})
    for row in sales:
        key = row.day.strftime("%Y-%m")
        months[key]["revenue"] += row.revenue
        months[key]["sales"] += row.num_sales
        months[key]["items"] += row.items_sold
    return [
        schemas.RevenueReport(period=k, total_revenue=float(v["revenue"]), total_sales=v["sales"], total_items_sold=v["items"])
        for k, v in sorted(months.items(), reverse=True)
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
