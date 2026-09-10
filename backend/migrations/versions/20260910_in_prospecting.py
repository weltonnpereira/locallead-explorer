"""add prospecting selection flag

Revision ID: 20260910_in_prospecting
Revises: 20260910_last_scraped_at
Create Date: 2026-09-10
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260910_in_prospecting"
down_revision: Union[str, None] = "20260910_last_scraped_at"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "leads",
        sa.Column("in_prospecting", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index("ix_leads_in_prospecting", "leads", ["in_prospecting"], unique=False)
    op.alter_column("leads", "in_prospecting", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_leads_in_prospecting", table_name="leads")
    op.drop_column("leads", "in_prospecting")
