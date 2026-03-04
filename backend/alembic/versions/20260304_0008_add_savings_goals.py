"""add savings goals and contributions

Revision ID: 20260304_0008
Revises: 20260304_0007
Create Date: 2026-03-04 21:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260304_0008"
down_revision = "20260304_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "savings_goals",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("target_cents", sa.Integer(), nullable=False),
        sa.Column("account_id", sa.String(length=36), nullable=False),
        sa.Column("category_id", sa.String(length=36), nullable=False),
        sa.Column("deadline", sa.Date(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="active"),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("target_cents > 0", name="ck_savings_goals_target_positive"),
        sa.CheckConstraint("status IN ('active','completed','cancelled')", name="ck_savings_goals_status"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_savings_goals_user_status_created", "savings_goals", ["user_id", "status", "created_at"], unique=False)
    op.create_index("idx_savings_goals_user_archived", "savings_goals", ["user_id", "archived_at"], unique=False)

    op.create_table(
        "savings_contributions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("goal_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("transaction_id", sa.String(length=36), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("contributed_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("amount_cents > 0", name="ck_savings_contributions_amount_positive"),
        sa.ForeignKeyConstraint(["goal_id"], ["savings_goals.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["transaction_id"], ["transactions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_savings_contributions_goal_contributed", "savings_contributions", ["goal_id", "contributed_at"], unique=False)


def downgrade() -> None:
    op.drop_index("idx_savings_contributions_goal_contributed", table_name="savings_contributions")
    op.drop_table("savings_contributions")

    op.drop_index("idx_savings_goals_user_archived", table_name="savings_goals")
    op.drop_index("idx_savings_goals_user_status_created", table_name="savings_goals")
    op.drop_table("savings_goals")
