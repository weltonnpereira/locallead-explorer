"""store commercial values as integer cents

Revision ID: 20260910_money_cents
Revises: 20260910_campaigns_deals
Create Date: 2026-09-10
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260910_money_cents"
down_revision: Union[str, None] = "20260910_campaigns_deals"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "leads",
        "proposal_value",
        existing_type=sa.Float(),
        type_=sa.Integer(),
        postgresql_using="CASE WHEN proposal_value IS NULL THEN NULL ELSE ROUND(proposal_value * 100)::integer END",
    )
    op.alter_column(
        "leads",
        "deal_value",
        existing_type=sa.Float(),
        type_=sa.Integer(),
        postgresql_using="CASE WHEN deal_value IS NULL THEN NULL ELSE ROUND(deal_value * 100)::integer END",
    )


def downgrade() -> None:
    op.alter_column(
        "leads",
        "proposal_value",
        existing_type=sa.Integer(),
        type_=sa.Float(),
        postgresql_using="CASE WHEN proposal_value IS NULL THEN NULL ELSE proposal_value / 100.0 END",
    )
    op.alter_column(
        "leads",
        "deal_value",
        existing_type=sa.Integer(),
        type_=sa.Float(),
        postgresql_using="CASE WHEN deal_value IS NULL THEN NULL ELSE deal_value / 100.0 END",
    )
