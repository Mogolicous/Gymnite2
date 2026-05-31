import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

async def main():
    database_url = os.environ.get("DATABASE_URL").replace("postgresql://", "postgresql+asyncpg://", 1).split("?")[0]
    engine = create_async_engine(database_url, connect_args={"ssl": "require"} if "neon.tech" in database_url else {})
    
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE routines ALTER COLUMN user_id DROP NOT NULL;"))
            print("Dropped NOT NULL constraint on user_id in routines table")
        except Exception as e:
            print(f"Error dropping NOT NULL constraint: {e}")

if __name__ == "__main__":
    asyncio.run(main())
