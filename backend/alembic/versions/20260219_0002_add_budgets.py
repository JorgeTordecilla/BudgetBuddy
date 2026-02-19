"""add budgets table

Revision ID: 20260219_0002
Revises: 20260218_0001
Create Date: 2026-02-19 10:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260219_0002"
down_revision = "20260218_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "budgets",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("category_id", sa.String(length=36), nullable=False),
        sa.Column("month", sa.String(length=7), nullable=False),
        sa.Column("limit_cents", sa.Integer(), nullable=False),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "uq_budgets_user_month_category_active",
        "budgets",
        ["user_id", "month", "category_id"],
        unique=True,
        postgresql_where=sa.text("archived_at IS NULL"),
        sqlite_where=sa.text("archived_at IS NULL"),
    )
    op.create_index("idx_budgets_user_month", "budgets", ["user_id", "month"], unique=False)


def downgrade() -> None:
    op.drop_index("uq_budgets_user_month_category_active", table_name="budgets")
    op.drop_index("idx_budgets_user_month", table_name="budgets")
    op.drop_table("budgets")
