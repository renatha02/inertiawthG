from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("/", response_model=List[schemas.AlertOut])
def list_alerts(
    status: Optional[schemas.AlertStatusEnum] = Query(default=None, description="Filter by status: unread or read"),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    query = db.query(models.Alert).order_by(models.Alert.created_at.desc())
    if status:
        query = query.filter(models.Alert.status == status)
    return query.all()


@router.patch("/{alert_id}/read", response_model=schemas.AlertOut)
def mark_alert_read(
    alert_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = models.AlertStatusEnum.read
    db.commit()
    db.refresh(alert)
    return alert
