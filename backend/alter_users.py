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
            await conn.execute(text("ALTER TABLE users ADD COLUMN plan_type VARCHAR DEFAULT 'pesas'"))
            print("Added plan_type column")
        except Exception as e:
            print(f"plan_type already exists? {e}")
            
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN requested_plan_type VARCHAR"))
            print("Added requested_plan_type column")
        except Exception as e:
            print(f"requested_plan_type already exists? {e}")

if __name__ == "__main__":
    asyncio.run(main())
