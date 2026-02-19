"""add audit events table

Revision ID: 20260219_0003
Revises: 20260219_0002
Create Date: 2026-02-19 16:20:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260219_0003"
down_revision = "20260219_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "audit_events",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("request_id", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("resource_type", sa.String(length=40), nullable=False),
        sa.Column("resource_id", sa.String(length=64), nullable=True),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_audit_events_user_created", "audit_events", ["user_id", "created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("idx_audit_events_user_created", table_name="audit_events")
    op.drop_table("audit_events")
