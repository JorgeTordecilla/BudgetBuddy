import sys
from datetime import date, timedelta

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.push_dispatcher import build_bill_payload, due_date_for_month, send_push
from app.db import SessionLocal
from app.models import Bill, BillPayment, PushSubscription


def list_due_bills(db: Session, *, today: date, target_dates: list[date]) -> list[tuple[Bill, date]]:
    current_month = today.strftime("%Y-%m")
    month_paid_bill_ids = set(
        db.scalars(select(BillPayment.bill_id).where(BillPayment.month == current_month)).all()
    )

    rows = list(
        db.scalars(
            select(Bill)
            .where(Bill.archived_at.is_(None))
            .where(Bill.is_active.is_(True))
        )
    )
    due_rows: list[tuple[Bill, date]] = []
    target_set = set(target_dates)
    for bill in rows:
        if bill.id in month_paid_bill_ids:
            continue
        due_date = due_date_for_month(bill.due_day, today)
        if due_date in target_set:
            due_rows.append((bill, due_date))
    return due_rows


def run(*, dry_run: bool = False, log_fn=print) -> int:
    today = date.today()
    targets = [today, today + timedelta(days=3)]
    sent = 0
    expired = 0
    skipped = 0

    with SessionLocal() as db:
        due_bills = list_due_bills(db, today=today, target_dates=targets)
        for bill, due_date in due_bills:
            subs = list(db.scalars(select(PushSubscription).where(PushSubscription.user_id == bill.user_id)))
            if not subs:
                skipped += 1
                continue

            payload = build_bill_payload(bill=bill, today=today, due_date=due_date)
            for sub in subs:
                if dry_run:
                    log_fn(
                        f"[dry-run] user={bill.user_id} bill='{bill.name}' due={due_date.isoformat()} endpoint={sub.endpoint[:60]}..."
                    )
                    continue

                ok = send_push(sub, payload)
                if ok:
                    sent += 1
                else:
                    db.execute(delete(PushSubscription).where(PushSubscription.id == sub.id))
                    expired += 1

        if not dry_run:
            db.commit()

    log_fn(f"send-bill-reminders status=done sent={sent} expired_cleaned={expired} no_subs_skipped={skipped}")
    return 0


def main() -> int:
    dry_run = "--dry-run" in sys.argv
    try:
        return run(dry_run=dry_run)
    except Exception as exc:
        print(f"send-bill-reminders status=error detail={exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
