"""ensure complete application schema exists

Revision ID: 20260910_schema_baseline
Revises: 20260910_wa_constraint
Create Date: 2026-09-10
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import inspect

revision: str = "20260910_schema_baseline"
down_revision: Union[str, None] = "20260910_wa_constraint"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

LEAD_STATUS_VALUES = (
    "NEW",
    "CONTACTED",
    "REPLIED",
    "MEETING",
    "PROPOSAL",
    "CUSTOMER",
    "LOST",
)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "searches" not in existing_tables:
        op.create_table(
            "searches",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("category", sa.String(), nullable=False),
            sa.Column("location", sa.String(), nullable=False),
            sa.Column("total_found", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_searches_id", "searches", ["id"], unique=False)

    if "leads" not in existing_tables:
        bind.execute(
            sa.text(
                """
                DO $$
                BEGIN
                    CREATE TYPE leadstatus AS ENUM (
                        'NEW', 'CONTACTED', 'REPLIED', 'MEETING',
                        'PROPOSAL', 'CUSTOMER', 'LOST'
                    );
                EXCEPTION
                    WHEN duplicate_object THEN NULL;
                END $$;
                """
            )
        )

        lead_status = postgresql.ENUM(
            *LEAD_STATUS_VALUES,
            name="leadstatus",
            create_type=False,
        )
        op.create_table(
            "leads",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("category", sa.String(), nullable=True),
            sa.Column("phone", sa.String(), nullable=True),
            sa.Column("whatsapp", sa.String(), nullable=True),
            sa.Column("address", sa.String(), nullable=True),
            sa.Column("city", sa.String(), nullable=True),
            sa.Column("state", sa.String(), nullable=True),
            sa.Column("google_rating", sa.Float(), nullable=True),
            sa.Column("google_reviews", sa.Integer(), nullable=True),
            sa.Column("website", sa.String(), nullable=True),
            sa.Column("instagram", sa.String(), nullable=True),
            sa.Column("google_maps_url", sa.String(), nullable=True),
            sa.Column("source", sa.String(), nullable=True),
            sa.Column("score", sa.Float(), nullable=True),
            sa.Column("opportunity", sa.Text(), nullable=True),
            sa.Column("status", lead_status, nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.Column("last_contact_at", sa.DateTime(), nullable=True),
            sa.Column("last_analyzed_at", sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("google_maps_url"),
        )
        op.create_index("ix_leads_id", "leads", ["id"], unique=False)

    if "search_lead" not in existing_tables:
        op.create_table(
            "search_lead",
            sa.Column("search_id", sa.Integer(), nullable=False),
            sa.Column("lead_id", sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(["search_id"], ["searches.id"]),
            sa.ForeignKeyConstraint(["lead_id"], ["leads.id"]),
            sa.PrimaryKeyConstraint("search_id", "lead_id"),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "search_lead" in existing_tables:
        op.drop_table("search_lead")
    if "leads" in existing_tables:
        op.drop_index("ix_leads_id", table_name="leads")
        op.drop_table("leads")
    if "searches" in existing_tables:
        op.drop_index("ix_searches_id", table_name="searches")
        op.drop_table("searches")
