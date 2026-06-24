from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from .. import models, schemas
from ..auth import (
    hash_password, verify_password, create_access_token,
    create_refresh_token, verify_refresh_token,
    create_password_reset_token, verify_password_reset_token,
    get_current_user, SECRET_KEY, ALGORITHM,
)
from ..database import get_db
from ..audit import log_activity
from jose import jwt, JWTError

router = APIRouter(prefix="/auth", tags=["Authentication"])

_optional_bearer = HTTPBearer(auto_error=False)


def _get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(_optional_bearer),
    db: Session = Depends(get_db),
) -> models.User | None:
    """Return the current user if a valid Bearer token is supplied, else None."""
    if credentials is None:
        return None
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        raw_sub = payload.get("sub")
        if raw_sub is None:
            return None
        user = db.query(models.User).filter(models.User.id == int(raw_sub)).first()
        return user
    except (JWTError, ValueError, TypeError):
        return None


@router.post("/register", response_model=schemas.UserOut, status_code=201)
def register(
    user_in: schemas.UserCreate,
    db: Session = Depends(get_db),
    caller: models.User | None = Depends(_get_optional_user),
):
    """
    Create a new user account.

    Bootstrap rule: if there are **no users yet**, the very first registration
    is allowed without authentication (creates the initial admin).

    After that:
    - A valid Bearer token is always required.
    - Any authenticated user can create a `cashier` account.
    - Only an `admin` can create `pharmacist` or `admin` accounts.
    """
    user_count = db.query(models.User).count()
    is_bootstrap = user_count == 0

    if not is_bootstrap:
        if caller is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required to register new users.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if user_in.role in (models.RoleEnum.admin, models.RoleEnum.pharmacist):
            if caller.role != models.RoleEnum.admin:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only admins can create pharmacist or admin accounts.",
                )

    existing = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = models.User(
        name=user_in.name,
        email=user_in.email,
        password=hash_password(user_in.password),
        role=user_in.role,
        phone=user_in.phone,
    )
    db.add(user)
    db.flush()
    caller_id = caller.id if caller else user.id  # bootstrap: log as self
    log_activity(db, caller_id, "CREATE", "User", user.id, {"email": user_in.email, "role": user_in.role.value})
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=schemas.Token)
def login(credentials: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token(user.id, db)
    db.commit()
    return schemas.Token(
        access_token=access_token,
        refresh_token=refresh_token,
        user=schemas.UserOut.from_orm(user),
    )


@router.post("/refresh", response_model=schemas.Token)
def refresh(req: schemas.RefreshRequest, db: Session = Depends(get_db)):
    db_token = verify_refresh_token(req.refresh_token, db)
    db_token.is_revoked = True
    user = db.query(models.User).filter(models.User.id == db_token.user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    access_token = create_access_token({"sub": str(user.id)})
    new_refresh_token = create_refresh_token(user.id, db)
    db.commit()
    return schemas.Token(
        access_token=access_token,
        refresh_token=new_refresh_token,
        user=schemas.UserOut.from_orm(user),
    )


@router.post("/logout", status_code=204)
def logout(req: schemas.RefreshRequest, db: Session = Depends(get_db)):
    db_token = verify_refresh_token(req.refresh_token, db)
    db_token.is_revoked = True
    db.commit()


@router.post("/forgot-password")
def forgot_password(req: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == req.email).first()
    if not user:
        return {"message": "If the email exists, a reset token has been sent via SMS."}
    token = create_password_reset_token(user.id, db)
    db.commit()
    from ..sms import send_sms
    if user.phone:
        send_sms(
            [user.phone],
            f"RENATHA password reset code: {token}\nValid for 1 hour.",
        )
    return {"message": "If the email exists, a reset token has been sent via SMS."}


@router.post("/reset-password")
def reset_password(req: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    db_token = verify_password_reset_token(req.token, db)
    user = db.query(models.User).filter(models.User.id == db_token.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.password = hash_password(req.new_password)
    db_token.is_used = True
    log_activity(db, user.id, "UPDATE", "User", user.id, {"action": "password_reset"})
    db.commit()
    return {"message": "Password has been reset successfully."}


@router.get("/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.post("/change-password", status_code=204)
def change_password(
    req: schemas.ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Allow a logged-in user to change their own password."""
    if not verify_password(req.old_password, current_user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )
    current_user.password = hash_password(req.new_password)
    log_activity(db, current_user.id, "UPDATE", "User", current_user.id, {"action": "self_change_password"})
    db.commit()
