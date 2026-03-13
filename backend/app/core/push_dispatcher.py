import calendar
import json
from datetime import date

from app.core.config import settings
from app.core.money import resolve_minor_units
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


def format_cents(cents: int, currency_code: str = "USD") -> str:
    digits = resolve_minor_units(currency_code)
    scale = 10**digits
    major_value = cents / scale
    formatted_en = f"{major_value:,.{digits}f}"
    # Use dot for thousands and comma for decimals for compact push copy.
    formatted = formatted_en.replace(",", "_").replace(".", ",").replace("_", ".")
    symbols = {
        "USD": "$",
        "COP": "$",
        "MXN": "$",
        "EUR": "EUR ",
    }
    return f"{symbols.get(currency_code.upper(), f'{currency_code.upper()} ')}{formatted}"


def due_date_for_month(due_day: int, anchor_date: date) -> date:
    last_day = calendar.monthrange(anchor_date.year, anchor_date.month)[1]
    effective_due_day = min(due_day, last_day)
    return date(anchor_date.year, anchor_date.month, effective_due_day)


def build_bill_payload(*, bill: Bill, today: date, due_date: date, currency_code: str = "USD") -> dict:
    days_left = (due_date - today).days
    amount = format_cents(bill.budget_cents, currency_code)

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
