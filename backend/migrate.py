import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

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
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN reset_code VARCHAR;"))
            print("Added reset_code column")
        except Exception as e:
            print(f"Error adding reset_code: {e}")
            
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN reset_code_expires_at VARCHAR;"))
            print("Added reset_code_expires_at column")
        except Exception as e:
            print(f"Error adding reset_code_expires_at: {e}")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
