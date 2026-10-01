from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select

from app.core.security import hash_password
from app.deps import DB, AdminUser
from app.models import User
from app.schemas import UserCreate, UserOut, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


def _get(db, user_id: int) -> User:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    return user


def _admins_left(db, excluding: int) -> int:
    return db.scalar(
        select(func.count())
        .select_from(User)
        .where(User.role == "admin", User.is_active, User.id != excluding)
    )


@router.get("", response_model=list[UserOut])
def list_users(db: DB, _: AdminUser):
    return db.scalars(select(User).order_by(User.id)).all()


@router.post("", response_model=UserOut, status_code=201)
def create_user(body: UserCreate, db: DB, _: AdminUser):
    if db.scalar(select(User).where(User.username == body.username)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Username already exists")
    user = User(username=body.username, password_hash=hash_password(body.password), role=body.role)
    db.add(user)
    db.commit()
    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(user_id: int, body: UserUpdate, db: DB, _: AdminUser):
    user = _get(db, user_id)
    losing_admin = user.is_admin and (
        (body.role is not None and body.role != "admin") or body.is_active is False
    )
    if losing_admin and _admins_left(db, user.id) == 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "At least one active admin is required")
    if body.role is not None:
        user.role = body.role
    if body.is_active is not None:
        user.is_active = body.is_active
    if body.password:
        user.password_hash = hash_password(body.password)
    db.commit()
    return user


@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: int, db: DB, admin: AdminUser):
    user = _get(db, user_id)
    if user.id == admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot delete your own account")
    db.delete(user)
    db.commit()
