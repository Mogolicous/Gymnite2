import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv
from server import Base

load_dotenv()

async def main():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL not found")
        return
        
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if "?" in database_url:
        database_url = database_url.split("?")[0]
        
    engine = create_async_engine(
        database_url, 
        echo=True, 
        connect_args={"ssl": "require"} if "neon.tech" in database_url else {}
    )
    
    async with engine.begin() as conn:
        print("Creating new tables...")
        await conn.run_sync(Base.metadata.create_all)
        print("Tables created successfully.")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
