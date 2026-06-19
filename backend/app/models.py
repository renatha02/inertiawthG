from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Numeric, Enum, Date, DateTime, Text, func
from sqlalchemy.orm import relationship
from .database import Base
import enum

class RoleEnum(str, enum.Enum):
    admin = "admin"
    pharmacist = "pharmacist"
    cashier = "cashier"

class AlertTypeEnum(str, enum.Enum):
    expiry = "expiry"
    low_stock = "low_stock"

class AlertStatusEnum(str, enum.Enum):
    unread = "unread"
    read = "read"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(Enum(RoleEnum), default=RoleEnum.cashier, nullable=False)
    phone = Column(String(20), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    sales = relationship("Sale", back_populates="user")

class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    contact_person = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    batches = relationship("Batch", back_populates="supplier")

class Drug(Base):
    __tablename__ = "drugs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    category = Column(String(100), nullable=True)
    unit = Column(String(50), nullable=True)
    reorder_level = Column(Integer, default=10, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    batches = relationship("Batch", back_populates="drug")
    sales = relationship("Sale", back_populates="drug")
    alerts = relationship("Alert", back_populates="drug")

class Batch(Base):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True)
    drug_id = Column(Integer, ForeignKey("drugs.id", ondelete="CASCADE"), nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True)
    batch_number = Column(String(100), nullable=False, index=True)
    quantity = Column(Integer, default=0, nullable=False)
    buying_price = Column(Numeric(10, 2), default=0.00, nullable=False)
    selling_price = Column(Numeric(10, 2), default=0.00, nullable=False)
    expiry_date = Column(Date, nullable=False)
    manufacture_date = Column(Date, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    drug = relationship("Drug", back_populates="batches")
    supplier = relationship("Supplier", back_populates="batches")
    allocations = relationship("SaleBatchAllocation", back_populates="batch")
    alerts = relationship("Alert", back_populates="batch")

class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    drug_id = Column(Integer, ForeignKey("drugs.id", ondelete="RESTRICT"), nullable=False)
    total_quantity = Column(Integer, nullable=False)
    total_price = Column(Numeric(10, 2), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="sales")
    drug = relationship("Drug", back_populates="sales")
    allocations = relationship("SaleBatchAllocation", back_populates="sale")

class SaleBatchAllocation(Base):
    __tablename__ = "sale_batch_allocations"

    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id", ondelete="CASCADE"), nullable=False)
    batch_id = Column(Integer, ForeignKey("batches.id", ondelete="RESTRICT"), nullable=False)
    quantity_deducted = Column(Integer, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    sale = relationship("Sale", back_populates="allocations")
    batch = relationship("Batch", back_populates="allocations")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    drug_id = Column(Integer, ForeignKey("drugs.id", ondelete="CASCADE"), nullable=False)
    batch_id = Column(Integer, ForeignKey("batches.id", ondelete="SET NULL"), nullable=True)
    type = Column(Enum(AlertTypeEnum), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(Enum(AlertStatusEnum), default=AlertStatusEnum.unread, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    drug = relationship("Drug", back_populates="alerts")
    batch = relationship("Batch", back_populates="alerts")


class StockAdjustment(Base):
    __tablename__ = "stock_adjustments"

    id = Column(Integer, primary_key=True, index=True)
    drug_id = Column(Integer, ForeignKey("drugs.id", ondelete="CASCADE"), nullable=False)
    batch_id = Column(Integer, ForeignKey("batches.id", ondelete="SET NULL"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    quantity_change = Column(Integer, nullable=False)  # negative for write-off, positive for correction
    reason = Column(String(255), nullable=False)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    drug = relationship("Drug")
    batch = relationship("Batch")
    user = relationship("User")
