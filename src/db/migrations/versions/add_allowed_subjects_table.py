"""Add allowed_subjects table

Revision ID: add_allowed_subjects
Revises: add_grade_pdf_url
Create Date: 2026-03-25 00:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "add_allowed_subjects"
down_revision: Union[str, Sequence[str], None] = "add_grade_pdf_url"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "allowed_subjects",
        sa.Column("allowed_subject_id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("subject_name", sa.String(), nullable=False),
        sa.Column("recommendation_note", sa.String(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("subject_name", name="uq_allowed_subjects_subject_name"),
    )
    op.create_index(
        "ix_allowed_subjects_subject_name",
        "allowed_subjects",
        ["subject_name"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_allowed_subjects_subject_name", table_name="allowed_subjects")
    op.drop_table("allowed_subjects")
