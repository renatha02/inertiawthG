from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date, datetime
from enum import Enum


# ─── Enums ─────────────────────────────────────────────────────────────────────
class RoleEnum(str, Enum):
    admin = "admin"
    pharmacist = "pharmacist"
    cashier = "cashier"

class AlertTypeEnum(str, Enum):
    expiry = "expiry"
    low_stock = "low_stock"

class AlertStatusEnum(str, Enum):
    unread = "unread"
    read = "read"


# ─── User Schemas ───────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: RoleEnum = RoleEnum.cashier
    phone: Optional[str] = None

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: RoleEnum
    phone: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ─── Supplier Schemas ───────────────────────────────────────────────────────────
class SupplierCreate(BaseModel):
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None

class SupplierOut(SupplierCreate):
    id: int
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─── Drug Schemas ───────────────────────────────────────────────────────────────
class DrugCreate(BaseModel):
    name: str
    category: Optional[str] = None
    unit: Optional[str] = None
    reorder_level: int = 10

class DrugUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    reorder_level: Optional[int] = None
    is_active: Optional[bool] = None

class DrugOut(BaseModel):
    id: int
    name: str
    category: Optional[str]
    unit: Optional[str]
    reorder_level: int
    is_active: bool
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─── Batch Schemas ───────────────────────────────────────────────────────────────
class BatchCreate(BaseModel):
    drug_id: int
    supplier_id: Optional[int] = None
    batch_number: str
    quantity: int
    buying_price: float
    selling_price: float
    expiry_date: date
    manufacture_date: Optional[date] = None

class BatchUpdate(BaseModel):
    quantity: Optional[int] = None
    buying_price: Optional[float] = None
    selling_price: Optional[float] = None
    expiry_date: Optional[date] = None

class BatchOut(BaseModel):
    id: int
    drug_id: int
    supplier_id: Optional[int]
    batch_number: str
    quantity: int
    buying_price: float
    selling_price: float
    expiry_date: date
    manufacture_date: Optional[date]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─── Sale Schemas ────────────────────────────────────────────────────────────────
class SaleCreate(BaseModel):
    drug_id: int
    total_quantity: int

class SaleBatchAllocationOut(BaseModel):
    batch_id: int
    quantity_deducted: int
    class Config:
        from_attributes = True

class SaleOut(BaseModel):
    id: int
    user_id: int
    drug_id: int
    total_quantity: int
    total_price: float
    allocations: list[SaleBatchAllocationOut] = []
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─── Alert Schemas ────────────────────────────────────────────────────────────────
class AlertOut(BaseModel):
    id: int
    drug_id: int
    batch_id: Optional[int]
    type: AlertTypeEnum
    message: str
    status: AlertStatusEnum
    created_at: Optional[datetime]

    class Config:
        from_attributes = True
