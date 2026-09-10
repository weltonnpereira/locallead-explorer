"""add website analysis persistence

Revision ID: 20260910_website_analysis
Revises:
Create Date: 2026-09-10
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260910_website_analysis"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "website_analyses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("website_url", sa.String(), nullable=False),
        sa.Column("has_website", sa.Boolean(), nullable=False),
        sa.Column("has_https", sa.Boolean(), nullable=False),
        sa.Column("has_whatsapp", sa.Boolean(), nullable=False),
        sa.Column("has_instagram", sa.Boolean(), nullable=False),
        sa.Column("has_form", sa.Boolean(), nullable=False),
        sa.Column("has_budget_cta", sa.Boolean(), nullable=False),
        sa.Column("has_phone_on_site", sa.Boolean(), nullable=False),
        sa.Column("is_custom_domain", sa.Boolean(), nullable=False),
        sa.Column("site_status", sa.String(), nullable=True),
        sa.Column("keywords_found", sa.Text(), nullable=False),
        sa.Column("analyzed_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("website_url"),
    )
    op.create_index(
        op.f("ix_website_analyses_id"),
        "website_analyses",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_website_analyses_website_url"),
        "website_analyses",
        ["website_url"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_website_analyses_website_url"), table_name="website_analyses")
    op.drop_index(op.f("ix_website_analyses_id"), table_name="website_analyses")
    op.drop_table("website_analyses")
