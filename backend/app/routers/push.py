import uuid

from fastapi import APIRouter, Body, Depends, Header, HTTPException, Response
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.push_dispatcher import send_push
from app.core.responses import vendor_response
from app.db import get_db
from app.dependencies import get_current_user
from app.models import PushSubscription, User
from app.schemas import (
    PushSubscribeRequest,
    PushSubscribeResponse,
    PushTestRequest,
    VapidPublicKeyResponse,
)

router = APIRouter(prefix="/push", tags=["push"])


@router.get("/vapid-public-key")
def get_vapid_public_key():
    if not settings.vapid_public_key:
        raise HTTPException(status_code=503, detail="Push is not configured")
    return vendor_response(VapidPublicKeyResponse(public_key=settings.vapid_public_key).model_dump())


def _upsert_subscription(db: Session, current_user_id: str, body: PushSubscribeRequest) -> PushSubscription:
    dialect_name = db.bind.dialect.name if db.bind is not None else ""
    if dialect_name == "postgresql":
        stmt = (
            pg_insert(PushSubscription)
            .values(
                id=str(uuid.uuid4()),
                user_id=current_user_id,
                endpoint=body.endpoint,
                p256dh=body.keys.p256dh,
                auth=body.keys.auth,
                user_agent=body.user_agent,
            )
            .on_conflict_do_update(
                index_elements=["endpoint"],
                set_={
                    "user_id": current_user_id,
                    "p256dh": body.keys.p256dh,
                    "auth": body.keys.auth,
                    "user_agent": body.user_agent,
                },
            )
            .returning(PushSubscription)
        )
        return db.execute(stmt).scalar_one()

    existing = db.scalar(select(PushSubscription).where(PushSubscription.endpoint == body.endpoint))
    if existing is None:
        existing = PushSubscription(
            id=str(uuid.uuid4()),
            user_id=current_user_id,
            endpoint=body.endpoint,
            p256dh=body.keys.p256dh,
            auth=body.keys.auth,
            user_agent=body.user_agent,
        )
        db.add(existing)
    else:
        existing.user_id = current_user_id
        existing.p256dh = body.keys.p256dh
        existing.auth = body.keys.auth
        existing.user_agent = body.user_agent
    return existing


@router.post("/subscribe")
def subscribe(
    body: PushSubscribeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sub = _upsert_subscription(db, current_user.id, body)
    db.commit()
    return vendor_response(
        PushSubscribeResponse(subscribed=True, endpoint=sub.endpoint).model_dump(),
        status_code=201,
    )


@router.delete("/unsubscribe", status_code=204)
def unsubscribe(
    endpoint: str = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.execute(
        delete(PushSubscription)
        .where(PushSubscription.user_id == current_user.id)
        .where(PushSubscription.endpoint == endpoint)
    )
    db.commit()
    return Response(status_code=204)


@router.post("/test", status_code=204)
def test_push(
    body: PushTestRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    x_push_test_token: str = Header(default="", alias="X-Push-Test-Token"),
):
    if settings.runtime_env == "production":
        raise HTTPException(status_code=404)
    if not settings.push_test_token or x_push_test_token != settings.push_test_token:
        raise HTTPException(status_code=401, detail="Invalid test token")

    subs = list(db.scalars(select(PushSubscription).where(PushSubscription.user_id == current_user.id)))
    if not subs:
        raise HTTPException(status_code=404, detail="No active subscriptions for this user")

    payload = {
        "title": body.title,
        "body": body.body,
        "icon": "/pwa-192x192.png",
        "badge": "/masked-icon.svg",
    }
    for sub in subs:
        ok = send_push(sub, payload)
        if not ok:
            db.execute(delete(PushSubscription).where(PushSubscription.id == sub.id))
    db.commit()
    return Response(status_code=204)
