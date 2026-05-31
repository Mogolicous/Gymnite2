import asyncio
import os
import sys
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from dotenv import load_dotenv

# Importar el modelo de User desde tu servidor
from server import User

load_dotenv()

async def main(email: str):
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("Error: No se encontró DATABASE_URL en el archivo .env")
        return
        
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1).split("?")[0]
    engine = create_async_engine(database_url, connect_args={"ssl": "require"} if "neon.tech" in database_url else {})
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if not user:
            print(f"Error: No se encontró ningún usuario con el correo '{email}'")
            return
            
        user.role = "coach"
        await session.commit()
        print(f"¡Éxito! El usuario {user.name} ({email}) ahora tiene el rol de COACH.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python make_coach.py <correo_del_usuario>")
    else:
        asyncio.run(main(sys.argv[1]))
