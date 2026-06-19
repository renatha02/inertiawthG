from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from decimal import Decimal
from datetime import date
from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db
from ..common import pagination_params, paginated_response

router = APIRouter(prefix="/sales", tags=["Sales"])


@router.post("/", response_model=schemas.SaleOut, status_code=201)
def create_sale(
    sale_in: schemas.SaleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Record a new sale using FIFO (First-In, First-Out) batch deduction.
    Automatically deducts stock from the oldest batches first.
    """
    # Fetch all batches for the drug with stock > 0, ordered by expiry_date ascending (FIFO)
    batches = (
        db.query(models.Batch)
        .filter(
            models.Batch.drug_id == sale_in.drug_id,
            models.Batch.quantity > 0,
        )
        .order_by(models.Batch.expiry_date.asc())
        .all()
    )

    total_available = sum(b.quantity for b in batches)
    if total_available < sale_in.total_quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock. Requested: {sale_in.total_quantity}, Available: {total_available}",
        )

    # FIFO deduction logic
    remaining = sale_in.total_quantity
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

    # Create the main sale record
    sale = models.Sale(
        user_id=current_user.id,
        drug_id=sale_in.drug_id,
        total_quantity=sale_in.total_quantity,
        total_price=total_price,
    )
    db.add(sale)
    db.flush()  # Get sale.id before committing

    # Create allocation records
    for alloc in allocations:
        db.add(models.SaleBatchAllocation(
            sale_id=sale.id,
            batch_id=alloc["batch"].id,
            quantity_deducted=alloc["deducted"],
        ))

    db.commit()
    db.refresh(sale)
    return sale


@router.get("/")
def list_sales(
    drug_id: Optional[int] = Query(None, description="Filter by drug ID"),
    user_id: Optional[int] = Query(None, description="Filter by cashier ID"),
    date_from: Optional[date] = Query(None, description="Start date (inclusive)"),
    date_to: Optional[date] = Query(None, description="End date (inclusive)"),
    pagination: dict = Depends(pagination_params),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    query = db.query(models.Sale)
    if drug_id:
        query = query.filter(models.Sale.drug_id == drug_id)
    if user_id:
        query = query.filter(models.Sale.user_id == user_id)
    if date_from:
        query = query.filter(func.date(models.Sale.created_at) >= date_from)
    if date_to:
        query = query.filter(func.date(models.Sale.created_at) <= date_to)
    query = query.order_by(models.Sale.created_at.desc())
    items, total = paginated_response(query, pagination["skip"], pagination["limit"])
    return {"items": [schemas.SaleOut.from_orm(i) for i in items], "total": total, **pagination}


@router.get("/{sale_id}", response_model=schemas.SaleOut)
def get_sale(sale_id: int, db: Session = Depends(get_db), _: models.User = Depends(get_current_user)):
    sale = db.query(models.Sale).filter(models.Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    return sale
