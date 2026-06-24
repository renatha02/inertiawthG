from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas
from ..auth import get_current_user, require_pharmacist_or_above
from ..database import get_db
from ..common import pagination_params, paginated_response
from ..audit import log_activity

router = APIRouter(prefix="/adjustments", tags=["Stock Adjustments"])


@router.post("/", response_model=schemas.StockAdjustmentOut, status_code=201)
def create_adjustment(
    adj_in: schemas.StockAdjustmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_pharmacist_or_above),
):
    """
    Record a stock adjustment (write-off, damage, correction).

    - If `batch_id` is provided: the adjustment is applied directly to that batch.
    - If `batch_id` is omitted and `quantity_change` is **negative** (write-off/damage):
      stock is deducted using FIFO across all batches for the drug.
    - If `batch_id` is omitted and `quantity_change` is **positive** (correction/restock):
      `batch_id` is required — stock increases must target a specific batch.
    """
    drug = db.query(models.Drug).filter(models.Drug.id == adj_in.drug_id, models.Drug.is_active == True).first()
    if not drug:
        raise HTTPException(status_code=404, detail="Active drug not found")

    resolved_batch_id = adj_in.batch_id  # may remain None for FIFO path

    if adj_in.batch_id:
        # ── Targeted adjustment: specific batch ────────────────────────────────
        batch = db.query(models.Batch).filter(
            models.Batch.id == adj_in.batch_id,
            models.Batch.drug_id == adj_in.drug_id,
        ).first()
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found for this drug")
        new_qty = batch.quantity + adj_in.quantity_change
        if new_qty < 0:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock in batch. Available: {batch.quantity}, adjustment: {adj_in.quantity_change}",
            )
        batch.quantity = new_qty

    elif adj_in.quantity_change < 0:
        # ── FIFO write-off: no specific batch targeted ─────────────────────────
        deduct_total = abs(adj_in.quantity_change)
        batches = (
            db.query(models.Batch)
            .filter(models.Batch.drug_id == adj_in.drug_id, models.Batch.quantity > 0)
            .order_by(models.Batch.expiry_date.asc())
            .all()
        )
        total_available = sum(b.quantity for b in batches)
        if total_available < deduct_total:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for write-off. Requested: {deduct_total}, Available: {total_available}",
            )
        remaining = deduct_total
        for batch in batches:
            if remaining <= 0:
                break
            take = min(remaining, batch.quantity)
            batch.quantity -= take
            remaining -= take
        # batch_id stays None — adjustment covers multiple batches via FIFO

    else:
        # ── Positive correction without a batch_id is ambiguous ───────────────
        raise HTTPException(
            status_code=400,
            detail="batch_id is required for positive stock corrections. "
                   "Specify which batch to add stock to.",
        )

    adjustment = models.StockAdjustment(
        drug_id=adj_in.drug_id,
        batch_id=resolved_batch_id,
        user_id=current_user.id,
        quantity_change=adj_in.quantity_change,
        reason=adj_in.reason,
        notes=adj_in.notes,
    )
    db.add(adjustment)
    db.flush()
    log_activity(db, current_user.id, "CREATE", "StockAdjustment", adjustment.id, adj_in.dict())
    db.commit()
    db.refresh(adjustment)
    return adjustment


@router.get("/")
def list_adjustments(
    pagination: dict = Depends(pagination_params),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    query = db.query(models.StockAdjustment).order_by(models.StockAdjustment.created_at.desc())
    items, total = paginated_response(query, pagination["skip"], pagination["limit"])
    return {"items": [schemas.StockAdjustmentOut.from_orm(i) for i in items], "total": total, **pagination}

