from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from .. import models, schemas
from ..auth import get_current_user, require_admin, require_pharmacist_or_above
from ..database import get_db
from ..common import pagination_params, paginated_response

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])


@router.post("/", response_model=schemas.SupplierOut, status_code=201)
def create_supplier(
    supplier_in: schemas.SupplierCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_pharmacist_or_above),
):
    supplier = models.Supplier(**supplier_in.dict())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.get("/")
def list_suppliers(
    search: Optional[str] = Query(None, description="Search by supplier name"),
    pagination: dict = Depends(pagination_params),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    query = db.query(models.Supplier)
    if search:
        query = query.filter(models.Supplier.name.ilike(f"%{search}%"))
    query = query.order_by(models.Supplier.name.asc())
    items, total = paginated_response(query, pagination["skip"], pagination["limit"])
    return {"items": [schemas.SupplierOut.from_orm(i) for i in items], "total": total, **pagination}


@router.get("/{supplier_id}", response_model=schemas.SupplierOut)
def get_supplier(supplier_id: int, db: Session = Depends(get_db), _: models.User = Depends(get_current_user)):
    supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier


@router.put("/{supplier_id}", response_model=schemas.SupplierOut)
def update_supplier(
    supplier_id: int,
    supplier_in: schemas.SupplierCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_pharmacist_or_above),  # cashier cannot edit suppliers
):
    supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    for key, value in supplier_in.dict(exclude_unset=True).items():
        setattr(supplier, key, value)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.delete("/{supplier_id}", status_code=204)
def delete_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),  # ADMIN ONLY
):
    supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    db.delete(supplier)
    db.commit()
