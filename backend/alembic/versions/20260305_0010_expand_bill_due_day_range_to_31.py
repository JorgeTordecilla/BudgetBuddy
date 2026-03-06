"""expand bill due day range to 31

Revision ID: 20260305_0010
Revises: 20260305_0009
Create Date: 2026-03-05 23:40:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260305_0010"
down_revision = "20260305_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    dialect_name = bind.dialect.name if bind is not None else ""
    if dialect_name == "sqlite":
        with op.batch_alter_table("bills", recreate="always") as batch_op:
            batch_op.drop_constraint("ck_bills_due_day_range", type_="check")
            batch_op.create_check_constraint("ck_bills_due_day_range", "due_day >= 1 AND due_day <= 31")
        return

    op.drop_constraint("ck_bills_due_day_range", "bills", type_="check")
    op.create_check_constraint("ck_bills_due_day_range", "bills", "due_day >= 1 AND due_day <= 31")


def downgrade() -> None:
    bind = op.get_bind()
    dialect_name = bind.dialect.name if bind is not None else ""
    if dialect_name == "sqlite":
        with op.batch_alter_table("bills", recreate="always") as batch_op:
            batch_op.drop_constraint("ck_bills_due_day_range", type_="check")
            batch_op.create_check_constraint("ck_bills_due_day_range", "due_day >= 1 AND due_day <= 28")
        return

    op.drop_constraint("ck_bills_due_day_range", "bills", type_="check")
    op.create_check_constraint("ck_bills_due_day_range", "bills", "due_day >= 1 AND due_day <= 28")
