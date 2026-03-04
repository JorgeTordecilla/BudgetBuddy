"""add bills and bill payments

Revision ID: 20260304_0007
Revises: 20260304_0006
Create Date: 2026-03-04 18:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260304_0007"
down_revision = "20260304_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "bills",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("due_day", sa.Integer(), nullable=False),
        sa.Column("budget_cents", sa.Integer(), nullable=False),
        sa.Column("category_id", sa.String(length=36), nullable=False),
        sa.Column("account_id", sa.String(length=36), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("due_day >= 1 AND due_day <= 28", name="ck_bills_due_day_range"),
        sa.CheckConstraint("budget_cents >= 0", name="ck_bills_budget_non_negative"),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_bills_user_due_day", "bills", ["user_id", "due_day"], unique=False)
    op.create_index("idx_bills_user_archived", "bills", ["user_id", "archived_at"], unique=False)

    op.create_table(
        "bill_payments",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("bill_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("month", sa.String(length=7), nullable=False),
        sa.Column("transaction_id", sa.String(length=36), nullable=False),
        sa.Column("actual_cents", sa.Integer(), nullable=False),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("actual_cents >= 0", name="ck_bill_payments_actual_non_negative"),
        sa.ForeignKeyConstraint(["bill_id"], ["bills.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["transaction_id"], ["transactions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("bill_id", "month", name="uq_bill_payments_bill_month"),
    )
    op.create_index("idx_bill_payments_user_month", "bill_payments", ["user_id", "month"], unique=False)
    op.create_index("idx_bill_payments_bill_month", "bill_payments", ["bill_id", "month"], unique=False)


def downgrade() -> None:
    op.drop_index("idx_bill_payments_bill_month", table_name="bill_payments")
    op.drop_index("idx_bill_payments_user_month", table_name="bill_payments")
    op.drop_table("bill_payments")

    op.drop_index("idx_bills_user_archived", table_name="bills")
    op.drop_index("idx_bills_user_due_day", table_name="bills")
    op.drop_table("bills")
