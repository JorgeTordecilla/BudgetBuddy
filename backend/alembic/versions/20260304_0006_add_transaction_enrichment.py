"""add transaction enrichment fields

Revision ID: 20260304_0006
Revises: 20260304_0005
Create Date: 2026-03-04 00:30:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260304_0006"
down_revision = "20260304_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("transactions", sa.Column("mood", sa.String(length=10), nullable=True))
    op.add_column("transactions", sa.Column("is_impulse", sa.Boolean(), nullable=True))


def downgrade() -> None:
    op.drop_column("transactions", "is_impulse")
    op.drop_column("transactions", "mood")
