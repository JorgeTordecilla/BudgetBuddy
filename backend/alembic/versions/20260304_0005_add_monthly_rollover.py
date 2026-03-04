"""add monthly rollover table

Revision ID: 20260304_0005
Revises: 20260303_0004
Create Date: 2026-03-04 00:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260304_0005"
down_revision = "20260303_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "monthly_rollover",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("source_month", sa.String(length=7), nullable=False),
        sa.Column("transaction_id", sa.String(length=36), nullable=False),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["transaction_id"], ["transactions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "source_month", name="uq_monthly_rollover_user_source_month"),
    )
    op.create_index("idx_monthly_rollover_user_created", "monthly_rollover", ["user_id", "created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("idx_monthly_rollover_user_created", table_name="monthly_rollover")
    op.drop_table("monthly_rollover")
