"""add lead scrape refresh timestamp

Revision ID: 20260910_last_scraped_at
Revises: 20260910_schema_baseline
Create Date: 2026-09-10
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260910_last_scraped_at"
down_revision: Union[str, None] = "20260910_schema_baseline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("leads", sa.Column("last_scraped_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("leads", "last_scraped_at")
