import re
import os

with open('alembic.ini', 'r') as f:
    text = f.read()
text = re.sub(r'sqlalchemy\.url\s*=\s*.*', '# sqlalchemy.url is configured in env.py', text)
with open('alembic.ini', 'w') as f:
    f.write(text)

with open('alembic/env.py', 'r') as f:
    text = f.read()

text = text.replace('target_metadata = None', '''import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from app.db.base import Base
from app.core.config import settings
target_metadata = Base.metadata''')

text = text.replace('context.configure(', 'config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)\n    context.configure(')

with open('alembic/env.py', 'w') as f:
    f.write(text)

print("Alembic config patched.")
