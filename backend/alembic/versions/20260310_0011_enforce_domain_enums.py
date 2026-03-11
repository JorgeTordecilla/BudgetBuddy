"""enforce domain enums with database constraints

Revision ID: 20260310_0011
Revises: 20260305_0010
Create Date: 2026-03-10 16:10:00
"""

from alembic import op


revision = "20260310_0011"
down_revision = "20260305_0010"
branch_labels = None
depends_on = None


def _is_sqlite() -> bool:
    return op.get_context().dialect.name == "sqlite"


def upgrade() -> None:
    if _is_sqlite():
        with op.batch_alter_table("accounts") as batch_op:
            batch_op.create_check_constraint("ck_accounts_type_enum", "type IN ('cash','debit','credit','bank')")

        with op.batch_alter_table("categories") as batch_op:
            batch_op.create_check_constraint("ck_categories_type_enum", "type IN ('income','expense')")

        with op.batch_alter_table("transactions") as batch_op:
            batch_op.create_check_constraint("ck_transactions_type_enum", "type IN ('income','expense')")
            batch_op.create_check_constraint(
                "ck_transactions_mood_enum",
                "mood IS NULL OR mood IN ('happy','neutral','sad','anxious','bored')",
            )

        with op.batch_alter_table("income_sources") as batch_op:
            batch_op.create_check_constraint("ck_income_sources_frequency_enum", "frequency IN ('monthly')")

        with op.batch_alter_table("savings_goals") as batch_op:
            batch_op.drop_constraint("ck_savings_goals_status", type_="check")
            batch_op.create_check_constraint("ck_savings_goals_status_enum", "status IN ('active','completed','cancelled')")
        return

    op.create_check_constraint("ck_accounts_type_enum", "accounts", "type IN ('cash','debit','credit','bank')")
    op.create_check_constraint("ck_categories_type_enum", "categories", "type IN ('income','expense')")
    op.create_check_constraint("ck_transactions_type_enum", "transactions", "type IN ('income','expense')")
    op.create_check_constraint(
        "ck_transactions_mood_enum",
        "transactions",
        "mood IS NULL OR mood IN ('happy','neutral','sad','anxious','bored')",
    )
    op.create_check_constraint("ck_income_sources_frequency_enum", "income_sources", "frequency IN ('monthly')")
    op.drop_constraint("ck_savings_goals_status", "savings_goals", type_="check")
    op.create_check_constraint("ck_savings_goals_status_enum", "savings_goals", "status IN ('active','completed','cancelled')")


def downgrade() -> None:
    if _is_sqlite():
        with op.batch_alter_table("savings_goals") as batch_op:
            batch_op.drop_constraint("ck_savings_goals_status_enum", type_="check")
            batch_op.create_check_constraint("ck_savings_goals_status", "status IN ('active','completed','cancelled')")

        with op.batch_alter_table("income_sources") as batch_op:
            batch_op.drop_constraint("ck_income_sources_frequency_enum", type_="check")

        with op.batch_alter_table("transactions") as batch_op:
            batch_op.drop_constraint("ck_transactions_mood_enum", type_="check")
            batch_op.drop_constraint("ck_transactions_type_enum", type_="check")

        with op.batch_alter_table("categories") as batch_op:
            batch_op.drop_constraint("ck_categories_type_enum", type_="check")

        with op.batch_alter_table("accounts") as batch_op:
            batch_op.drop_constraint("ck_accounts_type_enum", type_="check")
        return

    op.drop_constraint("ck_savings_goals_status_enum", "savings_goals", type_="check")
    op.create_check_constraint("ck_savings_goals_status", "savings_goals", "status IN ('active','completed','cancelled')")
    op.drop_constraint("ck_income_sources_frequency_enum", "income_sources", type_="check")
    op.drop_constraint("ck_transactions_mood_enum", "transactions", type_="check")
    op.drop_constraint("ck_transactions_type_enum", "transactions", type_="check")
    op.drop_constraint("ck_categories_type_enum", "categories", type_="check")
    op.drop_constraint("ck_accounts_type_enum", "accounts", type_="check")
