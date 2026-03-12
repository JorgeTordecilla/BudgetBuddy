import csv
import io
from typing import Iterator


def _csv_line(cells: list[object]) -> str:
    out = io.StringIO()
    writer = csv.writer(out, lineterminator="\n")
    writer.writerow(cells)
    return out.getvalue()


def _sanitize_csv_text_cell(value: str) -> str:
    if value.lstrip().startswith(("=", "+", "-", "@")):
        return f"'{value}"
    return value


def csv_stream(rows) -> Iterator[str]:
    header = [
        "date",
        "type",
        "account",
        "category",
        "amount_cents",
        "merchant",
        "note",
        "mood",
        "is_impulse",
    ]
    yield _csv_line(header)
    for tx, account_name, category_name in rows:
        account = _sanitize_csv_text_cell(account_name or "")
        category = _sanitize_csv_text_cell(category_name or "")
        merchant = _sanitize_csv_text_cell(tx.merchant or "")
        note = _sanitize_csv_text_cell(tx.note or "")
        yield _csv_line(
            [
                tx.date.isoformat(),
                tx.type,
                account,
                category,
                tx.amount_cents,
                merchant,
                note,
                tx.mood or "",
                "" if tx.is_impulse is None else str(tx.is_impulse).lower(),
            ]
        )

