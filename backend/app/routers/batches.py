from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
from .. import models, schemas
from ..auth import get_current_user, require_admin, require_pharmacist_or_above
from ..database import get_db
from ..common import pagination_params, paginated_response
from ..audit import log_activity

router = APIRouter(prefix="/batches", tags=["Batches"])


@router.post("/", response_model=schemas.BatchOut, status_code=201)
def create_batch(
    batch_in: schemas.BatchCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_pharmacist_or_above),
):
    drug = db.query(models.Drug).filter(models.Drug.id == batch_in.drug_id, models.Drug.is_active == True).first()
    if not drug:
        raise HTTPException(status_code=404, detail="Active drug not found")

    batch = models.Batch(**batch_in.dict())
    db.add(batch)
    db.flush()
    log_activity(db, current_user.id, "CREATE", "Batch", batch.id, batch_in.dict())
    db.commit()
    db.refresh(batch)
    return batch


@router.get("/")
def list_batches(
    drug_id: Optional[int] = Query(None, description="Filter by drug ID"),
    supplier_id: Optional[int] = Query(None, description="Filter by supplier ID"),
    search: Optional[str] = Query(None, description="Search by batch number"),
    expiry_before: Optional[date] = Query(None, description="Filter: expiry on or before this date"),
    expiry_after: Optional[date] = Query(None, description="Filter: expiry on or after this date"),
    in_stock_only: bool = Query(False, description="Only show batches with quantity > 0"),
    pagination: dict = Depends(pagination_params),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    query = db.query(models.Batch)
    if drug_id:
        query = query.filter(models.Batch.drug_id == drug_id)
    if supplier_id:
        query = query.filter(models.Batch.supplier_id == supplier_id)
    if search:
        query = query.filter(models.Batch.batch_number.ilike(f"%{search}%"))
    if expiry_before:
        query = query.filter(models.Batch.expiry_date <= expiry_before)
    if expiry_after:
        query = query.filter(models.Batch.expiry_date >= expiry_after)
    if in_stock_only:
        query = query.filter(models.Batch.quantity > 0)
    query = query.order_by(models.Batch.expiry_date.asc())
    items, total = paginated_response(query, pagination["skip"], pagination["limit"])
    return {"items": [schemas.BatchOut.from_orm(i) for i in items], "total": total, **pagination}


@router.get("/{batch_id}", response_model=schemas.BatchOut)
def get_batch(batch_id: int, db: Session = Depends(get_db), _: models.User = Depends(get_current_user)):
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return batch


@router.put("/{batch_id}", response_model=schemas.BatchOut)
def update_batch(
    batch_id: int,
    batch_in: schemas.BatchUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_pharmacist_or_above),
):
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    updated = batch_in.dict(exclude_unset=True)
    for key, value in updated.items():
        setattr(batch, key, value)
    log_activity(db, current_user.id, "UPDATE", "Batch", batch_id, {"changes": updated})
    db.commit()
    db.refresh(batch)
    return batch


@router.delete("/{batch_id}", status_code=204)
def delete_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    log_activity(db, current_user.id, "DELETE", "Batch", batch_id, {"batch_number": batch.batch_number})
    db.delete(batch)
    db.commit()
