from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..auth import get_current_user, require_admin, require_pharmacist_or_above
from ..database import get_db

router = APIRouter(prefix="/drugs", tags=["Drugs"])


@router.post("/", response_model=schemas.DrugOut, status_code=201)
def create_drug(
    drug_in: schemas.DrugCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_pharmacist_or_above),  # cashier cannot add drugs
):
    drug = models.Drug(**drug_in.dict())
    db.add(drug)
    db.commit()
    db.refresh(drug)
    return drug


@router.get("/", response_model=List[schemas.DrugOut])
def list_drugs(db: Session = Depends(get_db), _: models.User = Depends(get_current_user)):
    return db.query(models.Drug).filter(models.Drug.is_active == True).all()


@router.get("/{drug_id}", response_model=schemas.DrugOut)
def get_drug(drug_id: int, db: Session = Depends(get_db), _: models.User = Depends(get_current_user)):
    drug = db.query(models.Drug).filter(models.Drug.id == drug_id).first()
    if not drug:
        raise HTTPException(status_code=404, detail="Drug not found")
    return drug


@router.put("/{drug_id}", response_model=schemas.DrugOut)
def update_drug(
    drug_id: int,
    drug_in: schemas.DrugUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_pharmacist_or_above),  # cashier cannot edit drugs
):
    drug = db.query(models.Drug).filter(models.Drug.id == drug_id).first()
    if not drug:
        raise HTTPException(status_code=404, detail="Drug not found")
    for key, value in drug_in.dict(exclude_unset=True).items():
        setattr(drug, key, value)
    db.commit()
    db.refresh(drug)
    return drug


@router.delete("/{drug_id}", status_code=204)
def soft_delete_drug(
    drug_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),   # ADMIN ONLY
):
    """Soft-deletes a drug by setting is_active to False. Admin only."""
    drug = db.query(models.Drug).filter(models.Drug.id == drug_id).first()
    if not drug:
        raise HTTPException(status_code=404, detail="Drug not found")
    drug.is_active = False
    db.commit()
