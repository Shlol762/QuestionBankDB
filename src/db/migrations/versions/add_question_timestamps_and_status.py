"""Add question status and timestamps

Revision ID: add_question_status_ts
Revises: b536c1d3ccc6
Create Date: 2026-03-24 00:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "add_question_status_ts"
down_revision: Union[str, Sequence[str], None] = "b536c1d3ccc6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add updated_at column with default to current timestamp
    op.add_column(
        "question_bank",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    
    # Add status column with default to 'published' (for backward compatibility with existing questions)
    op.add_column(
        "question_bank",
        sa.Column(
            "status",
            sa.VARCHAR(20),
            server_default="published",
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("question_bank", "status")
    op.drop_column("question_bank", "updated_at")
