import json
from datetime import date

from app.core.config import settings
from app.models import Bill, PushSubscription


def send_push(subscription: PushSubscription, payload: dict) -> bool:
    """
    Return False for expired subscriptions (410 Gone) so callers can delete them.
    Raise for unexpected push provider errors.
    """
    try:
        from pywebpush import WebPushException, webpush
    except ImportError as exc:
        raise RuntimeError("pywebpush is required for push dispatch") from exc

    try:
        webpush(
            subscription_info={
                "endpoint": subscription.endpoint,
                "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth},
            },
            data=json.dumps(payload),
            vapid_private_key=settings.vapid_private_key,
            vapid_claims={"sub": settings.vapid_contact},
        )
        return True
    except WebPushException as exc:
        if exc.response is not None and exc.response.status_code == 410:
            return False
        raise


def format_cents(cents: int) -> str:
    major = cents // 100
    return f"${major:,}".replace(",", ".")


def due_date_for_month(due_day: int, anchor_date: date) -> date:
    return date(anchor_date.year, anchor_date.month, due_day)


def build_bill_payload(*, bill: Bill, today: date, due_date: date) -> dict:
    days_left = (due_date - today).days
    amount = format_cents(bill.budget_cents)

    if days_left == 0:
        title = f"Payment due today: {bill.name}"
        body = f"{amount} - tap to mark as paid"
    else:
        due_label = due_date.strftime("%d %b").lstrip("0")
        title = f"{bill.name} is due in {days_left} days"
        body = f"Due {due_label} - {amount}"

    return {
        "title": title,
        "body": body,
        "icon": "/pwa-192x192.png",
        "badge": "/masked-icon.svg",
        "tag": f"bill-{bill.id}",
        "renotify": False,
        "data": {
            "url": f"/app/bills?highlight={bill.id}",
            "bill_id": bill.id,
        },
        "actions": [
            {"action": "mark_paid", "title": "Mark paid"},
            {"action": "dismiss", "title": "Dismiss"},
        ],
    }
