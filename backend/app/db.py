import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# Load .env from the project root (one level up from backend/)
load_dotenv(dotenv_path='../.env')

DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise RuntimeError('DATABASE_URL is not set in .env')

# Connection pool to Postgres
engine = create_engine(DATABASE_URL, echo=False, pool_pre_ping=True)

# Factory that produces database sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class all models inherit from (SQLAlchemy 2.x style)
class Base(DeclarativeBase):
    pass


def get_db():
    """Yields a database session and closes it after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
