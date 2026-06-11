from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db

router = APIRouter(prefix="/batches", tags=["Batches"])


@router.post("/", response_model=schemas.BatchOut, status_code=201)
def create_batch(
    batch_in: schemas.BatchCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    # Ensure the drug exists and is active
    drug = db.query(models.Drug).filter(models.Drug.id == batch_in.drug_id, models.Drug.is_active == True).first()
    if not drug:
        raise HTTPException(status_code=404, detail="Active drug not found")
    
    batch = models.Batch(**batch_in.dict())
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return batch


@router.get("/", response_model=List[schemas.BatchOut])
def list_batches(db: Session = Depends(get_db), _: models.User = Depends(get_current_user)):
    return db.query(models.Batch).order_by(models.Batch.expiry_date.asc()).all()


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
    _: models.User = Depends(get_current_user),
):
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    for key, value in batch_in.dict(exclude_unset=True).items():
        setattr(batch, key, value)
    db.commit()
    db.refresh(batch)
    return batch


@router.delete("/{batch_id}", status_code=204)
def delete_batch(batch_id: int, db: Session = Depends(get_db), _: models.User = Depends(get_current_user)):
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    db.delete(batch)
    db.commit()
