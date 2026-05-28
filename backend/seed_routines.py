import asyncio
import os
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text, select, delete
from dotenv import load_dotenv
from server import Routine, RoutineExercise, User

load_dotenv()

async def main():
    database_url = os.environ.get("DATABASE_URL").replace("postgresql://", "postgresql+asyncpg://", 1).split("?")[0]
    engine = create_async_engine(database_url, connect_args={"ssl": "require"} if "neon.tech" in database_url else {})
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as session:
        # Get all users
        users = (await session.execute(select(User))).scalars().all()
        
        for user in users:
            # Delete existing routines for this user to avoid duplicates
            await session.execute(delete(RoutineExercise).where(RoutineExercise.routine_id.in_(
                select(Routine.id).where(Routine.user_id == user.id)
            )))
            await session.execute(delete(Routine).where(Routine.user_id == user.id))
            
            # Create 5 days
            days = [
                {"name": "Día 1: Pecho y Tríceps", "obj": "Hipertrofia", "ex": [
                    {"name": "Press de Banca Plano", "sets": 4, "reps": 10},
                    {"name": "Press Inclinado con Mancuernas", "sets": 4, "reps": 12},
                    {"name": "Aperturas en Polea", "sets": 3, "reps": 15},
                    {"name": "Extensión de Tríceps en Polea", "sets": 4, "reps": 12},
                    {"name": "Press Francés", "sets": 3, "reps": 10},
                ]},
                {"name": "Día 2: Espalda y Bíceps", "obj": "Fuerza y Volumen", "ex": [
                    {"name": "Dominadas o Jalón al Pecho", "sets": 4, "reps": 10},
                    {"name": "Remo con Barra", "sets": 4, "reps": 10},
                    {"name": "Remo en Polea Baja", "sets": 3, "reps": 12},
                    {"name": "Curl de Bíceps con Barra", "sets": 4, "reps": 10},
                    {"name": "Curl Martillo", "sets": 3, "reps": 12},
                ]},
                {"name": "Día 3: Piernas (Cuádriceps y Glúteos)", "obj": "Potencia", "ex": [
                    {"name": "Sentadillas Libres", "sets": 4, "reps": 10},
                    {"name": "Prensa de Piernas", "sets": 4, "reps": 12},
                    {"name": "Extensiones de Cuádriceps", "sets": 4, "reps": 15},
                    {"name": "Zancadas (Lunges)", "sets": 3, "reps": 12},
                    {"name": "Elevación de Talones", "sets": 4, "reps": 20},
                ]},
                {"name": "Día 4: Hombros y Abdomen", "obj": "Definición", "ex": [
                    {"name": "Press Militar con Barra", "sets": 4, "reps": 10},
                    {"name": "Elevaciones Laterales", "sets": 4, "reps": 15},
                    {"name": "Pájaros (Hombro Posterior)", "sets": 3, "reps": 15},
                    {"name": "Crunches en Polea", "sets": 4, "reps": 20},
                    {"name": "Plancha Abdominal", "sets": 4, "reps": 1, "rest": "60s"},
                ]},
                {"name": "Día 5: Piernas (Femorales) y Brazos", "obj": "Hipertrofia", "ex": [
                    {"name": "Peso Muerto Rumano", "sets": 4, "reps": 10},
                    {"name": "Curl de Piernas", "sets": 4, "reps": 12},
                    {"name": "Curl de Bíceps en Banco Scott", "sets": 3, "reps": 12},
                    {"name": "Extensión de Tríceps Copa", "sets": 3, "reps": 12},
                    {"name": "Hip Thrust", "sets": 4, "reps": 12},
                ]}
            ]
            
            for day in days:
                r_id = str(uuid.uuid4())
                r = Routine(id=r_id, user_id=user.id, name=day["name"], objective=day["obj"])
                session.add(r)
                for ex in day["ex"]:
                    e = RoutineExercise(id=str(uuid.uuid4()), routine_id=r_id, name=ex["name"], sets=ex["sets"], reps=ex["reps"], rest_seconds=ex.get("rest", "60s"))
                    session.add(e)
            
        await session.commit()
        print("Routines seeded!")

if __name__ == "__main__":
    asyncio.run(main())
