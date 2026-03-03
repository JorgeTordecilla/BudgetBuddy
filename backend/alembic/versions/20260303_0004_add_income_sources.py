"""add income sources and transaction source linkage

Revision ID: 20260303_0004
Revises: 20260219_0003
Create Date: 2026-03-03 12:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260303_0004"
down_revision = "20260219_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "income_sources",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("expected_amount_cents", sa.Integer(), nullable=False),
        sa.Column("frequency", sa.String(length=16), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_income_sources_user_created", "income_sources", ["user_id", "created_at"], unique=False)
    op.create_index(
        "uq_income_sources_user_name_active",
        "income_sources",
        ["user_id", "name"],
        unique=True,
        postgresql_where=sa.text("archived_at IS NULL"),
        sqlite_where=sa.text("archived_at IS NULL"),
    )

    op.add_column("transactions", sa.Column("income_source_id", sa.String(length=36), nullable=True))
    op.create_foreign_key(
        "fk_transactions_income_source_id",
        "transactions",
        "income_sources",
        ["income_source_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_transactions_income_source_id", "transactions", type_="foreignkey")
    op.drop_column("transactions", "income_source_id")

    op.drop_index("uq_income_sources_user_name_active", table_name="income_sources")
    op.drop_index("idx_income_sources_user_created", table_name="income_sources")
    op.drop_table("income_sources")
