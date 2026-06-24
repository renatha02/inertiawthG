"""
logs.py — Audit Log Viewer Router (Admin Only)

Exposes the activity_logs table so admins can review who did what and when.
All routes require admin role.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
from sqlalchemy import func
from .. import models, schemas
from ..auth import require_admin
from ..database import get_db
from ..common import pagination_params, paginated_response
from pydantic import BaseModel
import json

router = APIRouter(prefix="/logs", tags=["Audit Logs"])


# ─── Output Schema ───────────────────────────────────────────────────────────────

class ActivityLogOut(BaseModel):
    id: int
    user_id: Optional[int]
    action: str           # CREATE | UPDATE | DELETE
    entity_type: str      # Drug | Batch | Sale | User | Supplier | StockAdjustment …
    entity_id: Optional[int]
    details: Optional[dict]
    created_at: Optional[str]

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, obj: models.ActivityLog) -> "ActivityLogOut":
        # Deserialize the JSON string stored in details back to a dict
        details = None
        if obj.details:
            try:
                details = json.loads(obj.details)
            except (ValueError, TypeError):
                details = {"raw": obj.details}
        return cls(
            id=obj.id,
            user_id=obj.user_id,
            action=obj.action,
            entity_type=obj.entity_type,
            entity_id=obj.entity_id,
            details=details,
            created_at=obj.created_at.isoformat() if obj.created_at else None,
        )


# ─── Endpoints ───────────────────────────────────────────────────────────────────

@router.get("/")
def list_activity_logs(
    user_id: Optional[int] = Query(None, description="Filter by the user who performed the action"),
    action: Optional[str] = Query(None, description="Filter by action type: CREATE, UPDATE, DELETE"),
    entity_type: Optional[str] = Query(None, description="Filter by entity: Drug, Batch, Sale, User, Supplier, StockAdjustment …"),
    entity_id: Optional[int] = Query(None, description="Filter by the specific record ID that was affected"),
    date_from: Optional[date] = Query(None, description="Start date (inclusive)"),
    date_to: Optional[date] = Query(None, description="End date (inclusive)"),
    pagination: dict = Depends(pagination_params),
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    """
    Paginated audit log list. Admin only.

    Supports filtering by user, action type, entity type/ID, and date range.
    Ordered newest-first.
    """
    query = db.query(models.ActivityLog)

    if user_id is not None:
        query = query.filter(models.ActivityLog.user_id == user_id)
    if action:
        query = query.filter(models.ActivityLog.action == action.upper())
    if entity_type:
        query = query.filter(models.ActivityLog.entity_type == entity_type)
    if entity_id is not None:
        query = query.filter(models.ActivityLog.entity_id == entity_id)
    if date_from:
        query = query.filter(func.date(models.ActivityLog.created_at) >= date_from)
    if date_to:
        query = query.filter(func.date(models.ActivityLog.created_at) <= date_to)

    query = query.order_by(models.ActivityLog.created_at.desc())
    items, total = paginated_response(query, pagination["skip"], pagination["limit"])

    return {
        "items": [ActivityLogOut.from_orm(i) for i in items],
        "total": total,
        **pagination,
    }


@router.get("/{log_id}", response_model=ActivityLogOut)
def get_activity_log(
    log_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    """Fetch a single audit log entry by ID. Admin only."""
    log = db.query(models.ActivityLog).filter(models.ActivityLog.id == log_id).first()
    if not log:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Log entry not found")
    return ActivityLogOut.from_orm(log)
