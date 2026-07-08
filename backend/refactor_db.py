import os
import re

server_path = os.path.join(os.path.dirname(__file__), 'server.py')

with open(server_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports
content = content.replace(
    "from sqlalchemy import String, Boolean, Integer, Text, Float, ForeignKey, select, update, delete, func",
    "from sqlalchemy import String, Boolean, Integer, Text, Float, ForeignKey, select, update, delete, func, DateTime"
)

# 2. Replace the DB Models block
models_regex = r"# ----------------- DB Model -----------------(.*?)# ----------------- Helpers -----------------"
new_models = """# ----------------- DB Model -----------------
class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(80))
    email: Mapped[Optional[str]] = mapped_column(String, unique=True, index=True, nullable=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    role: Mapped[str] = mapped_column(String, default="user")
    created_at: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    email_changes_count: Mapped[int] = mapped_column(Integer, default=0)

class PasswordReset(Base):
    __tablename__ = "password_resets"
    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    code: Mapped[str] = mapped_column(String)
    expires_at: Mapped[str] = mapped_column(String)

class Subscription(Base):
    __tablename__ = "subscriptions"
    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    plan_type: Mapped[str] = mapped_column(String)
    plan_months: Mapped[int] = mapped_column(Integer)
    started_at: Mapped[str] = mapped_column(String)
    expires_at: Mapped[str] = mapped_column(String)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
class PaymentReceipt(Base):
    __tablename__ = "payment_receipts"
    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    receipt_image: Mapped[str] = mapped_column(Text)
    requested_plan_type: Mapped[str] = mapped_column(String)
    requested_plan_months: Mapped[int] = mapped_column(Integer)
    uploaded_at: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="pending") # pending, approved, rejected
    reviewed_at: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    admin_action_notes: Mapped[Optional[str]] = mapped_column(String, nullable=True)

class Attendance(Base):
    __tablename__ = "attendance"
    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    timestamp: Mapped[str] = mapped_column(String)

class PhysicalEvaluation(Base):
    __tablename__ = "physical_evaluations"
    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    date: Mapped[str] = mapped_column(String)
    weight_kg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    body_fat_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    muscle_mass_kg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

class Exercise(Base):
    __tablename__ = "exercises"
    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True)
    image_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)

class Routine(Base):
    __tablename__ = "routines"
    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    user_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("users.id"), index=True, nullable=True)
    name: Mapped[str] = mapped_column(String)
    objective: Mapped[Optional[str]] = mapped_column(String, nullable=True)

class RoutineExercise(Base):
    __tablename__ = "routine_exercises"
    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    routine_id: Mapped[str] = mapped_column(String, ForeignKey("routines.id"), index=True)
    exercise_id: Mapped[str] = mapped_column(String, ForeignKey("exercises.id"), index=True)
    sets: Mapped[int] = mapped_column(Integer)
    reps: Mapped[int] = mapped_column(Integer)
    rest_seconds: Mapped[Optional[str]] = mapped_column(String, nullable=True)

class ClassReservation(Base):
    __tablename__ = "class_reservations"
    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    date: Mapped[str] = mapped_column(String, index=True)
    shift: Mapped[str] = mapped_column(String)
    created_at: Mapped[str] = mapped_column(String)

# ----------------- Helpers -----------------"""
content = re.sub(models_regex, new_models, content, flags=re.DOTALL)

with open(server_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Models refactored successfully.")
