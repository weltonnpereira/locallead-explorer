from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from settings.config import DATABASE_URL

import redis.asyncio as redis

# redis setup
redis_client: redis.Redis = None

async def init_redis():
    global redis_client
    redis_client = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)
    
async def close_redis():
    global redis_client
    if redis_client:
        await redis_client.close()
        redis_client = None
        
async def clear_leads_cache():
    if not redis_client:
        return

    try:
        keys = await redis_client.keys("leads:*")
        if keys:
            await redis_client.delete(*keys)
    except Exception:
        pass

# sqlalchemy database setup
if "sqlite" in DATABASE_URL:
    connect_args = {"check_same_thread": False}
else:
    connect_args = {}
    
engine = create_engine(
    DATABASE_URL, 
    connect_args=connect_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()