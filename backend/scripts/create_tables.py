from app.db import Base, engine
from app.models.asteroid import Asteroid
from app.models.close_approach import CloseApproach

if __name__ == '__main__':
    print('Creating database tables...')
    Base.metadata.create_all(bind=engine)
    print('Tables created successfully.')
