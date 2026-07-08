import asyncio
import os
from server import Base, engine, AsyncSessionLocal, User, Role, UserCredential, hash_password
from datetime import datetime, timezone
import uuid

async def seed():
    # Only remove local sqlite db
    db_path = os.path.join(os.path.dirname(__file__), "gymnite.db")
    if os.path.exists(db_path):
        os.remove(db_path)
        print("Eliminada gymnite.db antigua.")
        
    # Create tables
    async with engine.begin() as conn:
        print("Borrando tablas remotas antiguas (drop_all)...")
        await conn.run_sync(Base.metadata.drop_all)
        print("Creando nuevas tablas con roles separados...")
        await conn.run_sync(Base.metadata.create_all)
        
    async with AsyncSessionLocal() as db:
        # Create roles
        role_user = Role(id=str(uuid.uuid4()), name="user", description="Usuario Regular")
        role_coach = Role(id=str(uuid.uuid4()), name="coach", description="Entrenador")
        role_admin = Role(id=str(uuid.uuid4()), name="admin", description="Administrador")
        db.add_all([role_user, role_coach, role_admin])
        await db.commit()
        
        # Create admin
        admin_id = str(uuid.uuid4())
        admin_user = User(
            id=admin_id,
            role_id=role_admin.id,
            name="Admin Gymnite",
            email="admin@gymnite.com",
            created_at=datetime.now(timezone.utc).isoformat(),
            email_changes_count=0
        )
        db.add(admin_user)
        
        admin_cred = UserCredential(
            id=str(uuid.uuid4()),
            user_id=admin_id,
            password_hash=hash_password("admin123")
        )
        db.add(admin_cred)
        
        await db.commit()
        print(f"Roles creados y Administrador inyectado exitosamente: admin@gymnite.com / admin123")

if __name__ == "__main__":
    asyncio.run(seed())
