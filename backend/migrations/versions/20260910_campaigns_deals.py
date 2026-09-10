"""add campaigns and commercial lead values

Revision ID: 20260910_campaigns_deals
Revises: 20260910_in_prospecting
Create Date: 2026-09-10
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260910_campaigns_deals"
down_revision: Union[str, None] = "20260910_in_prospecting"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("leads", sa.Column("proposal_value", sa.Float(), nullable=True))
    op.add_column("leads", sa.Column("deal_value", sa.Float(), nullable=True))
    op.add_column("leads", sa.Column("deal_closed_at", sa.DateTime(), nullable=True))
    op.create_table(
        "campaigns",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("category", sa.String(), nullable=True),
        sa.Column("city", sa.String(), nullable=True),
        sa.Column("status", sa.Enum("ACTIVE", "PAUSED", "COMPLETED", name="campaignstatus"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_campaigns_id", "campaigns", ["id"], unique=False)
    op.create_table(
        "campaign_lead",
        sa.Column("campaign_id", sa.Integer(), nullable=False),
        sa.Column("lead_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["campaign_id"], ["campaigns.id"]),
        sa.ForeignKeyConstraint(["lead_id"], ["leads.id"]),
        sa.PrimaryKeyConstraint("campaign_id", "lead_id"),
    )


def downgrade() -> None:
    op.drop_table("campaign_lead")
    op.drop_index("ix_campaigns_id", table_name="campaigns")
    op.drop_table("campaigns")
    op.drop_column("leads", "deal_closed_at")
    op.drop_column("leads", "deal_value")
    op.drop_column("leads", "proposal_value")
    sa.Enum(name="campaignstatus").drop(op.get_bind(), checkfirst=True)
