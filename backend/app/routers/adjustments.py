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
    drug = db.query(models.Drug).filter(models.Drug.id == adj_in.drug_id, models.Drug.is_active == True).first()
    if not drug:
        raise HTTPException(status_code=404, detail="Active drug not found")

    if adj_in.batch_id:
        batch = db.query(models.Batch).filter(models.Batch.id == adj_in.batch_id, models.Batch.drug_id == adj_in.drug_id).first()
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found for this drug")
        if batch.quantity + adj_in.quantity_change < 0:
            raise HTTPException(status_code=400, detail=f"Insufficient stock in batch. Available: {batch.quantity}, adjustment: {adj_in.quantity_change}")
        batch.quantity += adj_in.quantity_change

    adjustment = models.StockAdjustment(
        drug_id=adj_in.drug_id,
        batch_id=adj_in.batch_id,
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
