"""
Revision script to add user_preferences column to users table.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

def upgrade():
    op.add_column('users', sa.Column('user_preferences', sa.JSON(), nullable=True))

def downgrade():
    op.drop_column('users', 'user_preferences')
