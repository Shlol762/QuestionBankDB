"""add_user_preferences_column

Revision ID: add_user_preferences_column
Revises: 
Create Date: 2026-03-23 00:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "add_user_preferences_column"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("user_preferences", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "user_preferences")
