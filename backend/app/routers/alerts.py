from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db
from ..common import pagination_params, paginated_response

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("/")
def list_alerts(
    status: Optional[schemas.AlertStatusEnum] = Query(default=None, description="Filter by status: unread or read"),
    alert_type: Optional[schemas.AlertTypeEnum] = Query(default=None, alias="type", description="Filter by type: expiry or low_stock"),
    pagination: dict = Depends(pagination_params),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    query = db.query(models.Alert).order_by(models.Alert.created_at.desc())
    if status:
        query = query.filter(models.Alert.status == status)
    if alert_type:
        query = query.filter(models.Alert.type == alert_type)
    items, total = paginated_response(query, pagination["skip"], pagination["limit"])
    return {"items": [schemas.AlertOut.from_orm(i) for i in items], "total": total, **pagination}


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
