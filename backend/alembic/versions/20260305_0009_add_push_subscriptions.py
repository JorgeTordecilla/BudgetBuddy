"""add push subscriptions

Revision ID: 20260305_0009
Revises: 20260304_0008
Create Date: 2026-03-05 23:30:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260305_0009"
down_revision = "20260304_0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "push_subscriptions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("endpoint", sa.Text(), nullable=False),
        sa.Column("p256dh", sa.Text(), nullable=False),
        sa.Column("auth", sa.Text(), nullable=False),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("endpoint"),
    )
    op.create_index("ix_push_sub_user_id", "push_subscriptions", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_push_sub_user_id", table_name="push_subscriptions")
    op.drop_table("push_subscriptions")
