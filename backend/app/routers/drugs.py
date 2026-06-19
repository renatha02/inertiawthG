from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from .. import models, schemas
from ..auth import get_current_user, require_admin, require_pharmacist_or_above
from ..database import get_db
from ..common import pagination_params, paginated_response

router = APIRouter(prefix="/drugs", tags=["Drugs"])


@router.post("/", response_model=schemas.DrugOut, status_code=201)
def create_drug(
    drug_in: schemas.DrugCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_pharmacist_or_above),
):
    drug = models.Drug(**drug_in.dict())
    db.add(drug)
    db.commit()
    db.refresh(drug)
    return drug


@router.get("/")
def list_drugs(
    search: Optional[str] = Query(None, description="Search by drug name"),
    category: Optional[str] = Query(None, description="Filter by category"),
    include_inactive: bool = Query(False, description="Include soft-deleted drugs"),
    pagination: dict = Depends(pagination_params),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    query = db.query(models.Drug)
    if not include_inactive:
        query = query.filter(models.Drug.is_active == True)
    if search:
        query = query.filter(models.Drug.name.ilike(f"%{search}%"))
    if category:
        query = query.filter(models.Drug.category == category)
    query = query.order_by(models.Drug.name.asc())
    items, total = paginated_response(query, pagination["skip"], pagination["limit"])
    return {"items": [schemas.DrugOut.from_orm(i) for i in items], "total": total, **pagination}


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
