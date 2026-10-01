from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.security import API_KEY_PREFIX, generate_api_key, hash_api_key
from app.deps import DB, CurrentUser
from app.models import ApiKey
from app.schemas import ApiKeyCreate, ApiKeyCreated, ApiKeyOut

router = APIRouter(prefix="/api-keys", tags=["api keys"])


@router.get("", response_model=list[ApiKeyOut])
def list_keys(user: CurrentUser, db: DB):
    return db.scalars(
        select(ApiKey).where(ApiKey.user_id == user.id).order_by(ApiKey.created_at.desc())
    ).all()


@router.post("", response_model=ApiKeyCreated, status_code=201)
def create_key(body: ApiKeyCreate, user: CurrentUser, db: DB):
    key = generate_api_key()
    row = ApiKey(
        user_id=user.id,
        name=body.name,
        key_hash=hash_api_key(key),
        prefix=key[: len(API_KEY_PREFIX) + 6],
    )
    db.add(row)
    db.commit()
    return ApiKeyCreated(**ApiKeyOut.model_validate(row).model_dump(), key=key)


@router.delete("/{key_id}", status_code=204)
def delete_key(key_id: int, user: CurrentUser, db: DB):
    row = db.get(ApiKey, key_id)
    if not row or row.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "API key not found")
    db.delete(row)
    db.commit()
