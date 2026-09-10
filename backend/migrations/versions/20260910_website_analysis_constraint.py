"""align website analysis uniqueness with model

Revision ID: 20260910_website_analysis_constraint
Revises: 20260910_website_analysis
Create Date: 2026-09-10
"""
from typing import Sequence, Union

from alembic import op

revision: str = "20260910_wa_constraint"
down_revision: Union[str, None] = "20260910_website_analysis"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint(
        "website_analyses_website_url_key",
        "website_analyses",
        type_="unique",
    )


def downgrade() -> None:
    op.create_unique_constraint(
        "website_analyses_website_url_key",
        "website_analyses",
        ["website_url"],
    )
