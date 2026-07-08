from dotenv import load_dotenv
from pathlib import Path
import os
import secrets
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List
import base64

import bcrypt
import jwt
import resend
import openai
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base, Mapped, mapped_column, relationship
from sqlalchemy import String, Boolean, Integer, Text, Float, ForeignKey, select, update, delete, func, DateTime

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import json
wger_images = {}
wger_images_path = os.path.join(os.path.dirname(__file__), "wger_images.json")
try:
    if os.path.exists(wger_images_path):
        with open(wger_images_path, "r", encoding="utf-8") as f:
            wger_images = json.load(f)
except Exception:
    pass

# ----------------- Config -----------------
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 60 * 24  # 1 day
REFRESH_TOKEN_DAYS = 7

# PostgreSQL URL from .env or a default
database_url = os.environ.get("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost/gymnite")

# Resend config
resend.api_key = os.environ.get("RESEND_API_KEY", "")
email_from = os.environ.get("EMAIL_FROM", "GymNite Soporte <soporte@gymnite.es>")

# OpenAI config
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

# Fix for Neon and other cloud providers that give 'postgres://'
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Asyncpg does not support sslmode=require in the query string
# Strip the query parameters to prevent TypeError and pass connect_args
if "?" in database_url:
    database_url = database_url.split("?")[0]

engine = create_async_engine(
    database_url, 
    echo=False, 
    connect_args={"ssl": "require"} if "neon.tech" in database_url else {}
)
AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()

app = FastAPI()
api_router = APIRouter(prefix="/api")
logger = logging.getLogger("gymnite")
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

# ----------------- DB Model -----------------
class Role(Base):
    __tablename__ = "roles"
    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)

class UserCredential(Base):
    __tablename__ = "user_credentials"
    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    password_hash: Mapped[str] = mapped_column(String)
    
    user = relationship("User", back_populates="credential")

class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    role_id: Mapped[str] = mapped_column(String, ForeignKey("roles.id"))
    name: Mapped[str] = mapped_column(String(80))
    email: Mapped[Optional[str]] = mapped_column(String, unique=True, index=True, nullable=True)
    rfid_uid: Mapped[Optional[str]] = mapped_column(String, unique=True, index=True, nullable=True)
    created_at: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    email_changes_count: Mapped[int] = mapped_column(Integer, default=0)
    
    role = relationship("Role", lazy="joined")
    credential = relationship("UserCredential", back_populates="user", uselist=False, cascade="all, delete-orphan")
    password_resets = relationship("PasswordReset", back_populates="user", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="user", cascade="all, delete-orphan")
    payment_receipts = relationship("PaymentReceipt", back_populates="user", cascade="all, delete-orphan")

class PasswordReset(Base):
    __tablename__ = "password_resets"
    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    code: Mapped[str] = mapped_column(String)
    expires_at: Mapped[str] = mapped_column(String)
    
    user = relationship("User", back_populates="password_resets")

class Subscription(Base):
    __tablename__ = "subscriptions"
    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    plan_type: Mapped[str] = mapped_column(String)
    plan_months: Mapped[int] = mapped_column(Integer)
    started_at: Mapped[str] = mapped_column(String)
    expires_at: Mapped[str] = mapped_column(String)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    user = relationship("User", back_populates="subscriptions")

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
    
    user = relationship("User", back_populates="payment_receipts")

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

# ----------------- Helpers -----------------
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def get_jwt_secret() -> str:
    return os.environ.get("JWT_SECRET", "supersecret")

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MINUTES),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_DAYS),
        "type": "refresh",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def set_auth_cookies(response: Response, access: str, refresh: str) -> None:
    response.set_cookie(
        key="access_token", value=access, httponly=True, secure=True,
        samesite="none", max_age=ACCESS_TOKEN_MINUTES * 60, path="/",
    )
    response.set_cookie(
        key="refresh_token", value=refresh, httponly=True, secure=True,
        samesite="none", max_age=REFRESH_TOKEN_DAYS * 24 * 60 * 60, path="/",
    )

def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")

async def serialize_user(u: User, db: AsyncSession) -> dict:
    from sqlalchemy import select, desc
    
    status = "no_subscribed"
    has_receipt = False
    receipt_uploaded_at = None
    approved_at = None
    plan_months = None
    plan_type = "pesas"
    plan_started_at = None
    plan_expires_at = None
    requested_plan_months = None
    requested_plan_type = None
    last_admin_action = None
    last_admin_action_at = None
    rfid_uid = u.rfid_uid
    
    # 1. Check Subscriptions
    result_sub = await db.execute(
        select(Subscription)
        .where(Subscription.user_id == u.id, Subscription.is_active == True)
        .order_by(desc(Subscription.started_at))
        .limit(1)
    )
    active_sub = result_sub.scalar_one_or_none()
    
    # 2. Check Receipts
    result_rec = await db.execute(
        select(PaymentReceipt)
        .where(PaymentReceipt.user_id == u.id)
        .order_by(desc(PaymentReceipt.uploaded_at))
        .limit(1)
    )
    latest_receipt = result_rec.scalar_one_or_none()
    
    if active_sub:
        status = "subscribed"
        plan_months = active_sub.plan_months
        plan_type = active_sub.plan_type
        plan_started_at = active_sub.started_at
        plan_expires_at = active_sub.expires_at
        approved_at = active_sub.started_at
    elif latest_receipt and latest_receipt.status == "pending":
        status = "pending"
    
    if latest_receipt:
        has_receipt = True if latest_receipt.receipt_image else False
        receipt_uploaded_at = latest_receipt.uploaded_at
        requested_plan_months = latest_receipt.requested_plan_months
        requested_plan_type = latest_receipt.requested_plan_type
        
        if latest_receipt.status == "approved":
            last_admin_action = "approved"
            last_admin_action_at = latest_receipt.reviewed_at
        elif latest_receipt.status == "rejected":
            last_admin_action = "rejected"
            last_admin_action_at = latest_receipt.reviewed_at
            
    return {
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "role": u.role.name if u.role else "user",
        "status": status,
        "has_receipt": has_receipt,
        "receipt_uploaded_at": receipt_uploaded_at,
        "approved_at": approved_at,
        "created_at": u.created_at,
        "manual": False,
        "plan_months": plan_months,
        "plan_type": plan_type,
        "plan_started_at": plan_started_at,
        "plan_expires_at": plan_expires_at,
        "requested_plan_months": requested_plan_months,
        "requested_plan_type": requested_plan_type,
        "last_admin_action": last_admin_action,
        "last_admin_action_at": last_admin_action_at,
        "rfid_uid": rfid_uid,
        "email_changes_count": u.email_changes_count,
    }

async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="No autenticado")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Token inválido")
        
        result = await db.execute(select(User).where(User.id == payload["sub"]))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role.name != "admin":
        raise HTTPException(status_code=403, detail="Se requieren permisos de administrador")
    return user

async def require_coach_or_admin(user: User = Depends(get_current_user)) -> User:
    if user.role.name not in ["admin", "coach"]:
        raise HTTPException(status_code=403, detail="Se requieren permisos de coach o administrador")
    return user

# ----------------- Models -----------------
class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=5, max_length=128)

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    name: str
    email: Optional[EmailStr] = None
    role: str
    status: str
    has_receipt: bool = False
    receipt_uploaded_at: Optional[str] = None
    approved_at: Optional[str] = None
    created_at: Optional[str] = None
    manual: bool = False
    plan_months: Optional[int] = None
    plan_type: Optional[str] = "pesas"
    plan_started_at: Optional[str] = None
    plan_expires_at: Optional[str] = None
    requested_plan_months: Optional[int] = None
    requested_plan_type: Optional[str] = None
    last_admin_action: Optional[str] = None
    last_admin_action_at: Optional[str] = None

class ApproveIn(BaseModel):
    plan_months: int
    plan_type: str = "pesas"

class ForgotPasswordIn(BaseModel):
    email: EmailStr

class ResetPasswordIn(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=5, max_length=128)

class AttendanceOut(BaseModel):
    id: str
    user_id: str
    date: str
    timestamp: str

class PhysicalEvaluationIn(BaseModel):
    date: str
    weight_kg: Optional[float] = None
    body_fat_pct: Optional[float] = None
    muscle_mass_kg: Optional[float] = None
    notes: Optional[str] = None

class PhysicalEvaluationOut(PhysicalEvaluationIn):
    id: str
    user_id: str

class RoutineExerciseOut(BaseModel):
    id: str
    routine_id: str
    name: str
    sets: int
    reps: int
    rest_seconds: Optional[str] = None
    image_url: Optional[str] = None

class RoutineOut(BaseModel):
    id: str
    user_id: str
    name: str
    objective: Optional[str] = None
    exercises: List[RoutineExerciseOut] = []

class RoutineIn(BaseModel):
    user_id: Optional[str] = None
    name: str
    objective: Optional[str] = None

class RoutineExerciseIn(BaseModel):
    name: str
    sets: int
    reps: int
    rest_seconds: Optional[str] = "60s"
    image_url: Optional[str] = None
    reps: int
    rest_seconds: Optional[str] = None

class GenerateRoutineIn(BaseModel):
    muscle: str = Field(..., min_length=2, max_length=50)
    level: str = "Intermedio"
    time: str = "Normal (45m)"
    goal: str = "Hipertrofia"
    injuries: Optional[str] = None

class ReservationIn(BaseModel):
    date: str
    shift: str

class ReservationOut(BaseModel):
    id: str
    user_id: str
    date: str
    shift: str
    created_at: str

class AdminReservationOut(BaseModel):
    id: str
    date: str
    shift: str
    user_id: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    created_at: str

class ChangeEmailIn(BaseModel):
    new_email: EmailStr
    current_password: str = Field(min_length=1)

# ----------------- Auth Endpoints -----------------
@api_router.post("/auth/register", response_model=UserOut)
async def register(payload: RegisterIn, response: Response, db: AsyncSession = Depends(get_db)):
    email = payload.email.lower().strip()
    result = await db.execute(select(User).where(User.email == email))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")
    
    user_id = str(uuid.uuid4())
    result_role = await db.execute(select(Role).where(Role.name == "user"))
    user_role = result_role.scalar_one_or_none()
    if not user_role:
        raise HTTPException(status_code=500, detail="Error interno: Rol no encontrado")
        
    new_user = User(
        id=user_id,
        role_id=user_role.id,
        name=payload.name.strip(),
        email=email,
        created_at=datetime.now(timezone.utc).isoformat(),
        email_changes_count=0
    )
    db.add(new_user)
    
    cred = UserCredential(
        id=str(uuid.uuid4()),
        user_id=user_id,
        password_hash=hash_password(payload.password)
    )
    db.add(cred)
    await db.commit()
    await db.refresh(new_user)

    access = create_access_token(user_id, email, "user")
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    return await serialize_user(new_user, db)

@api_router.post("/auth/login", response_model=UserOut)
async def login(payload: LoginIn, response: Response, db: AsyncSession = Depends(get_db)):
    email = payload.email.lower().strip()
    from sqlalchemy.orm import selectinload
    result = await db.execute(select(User).options(selectinload(User.credential)).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user or not user.credential or not verify_password(payload.password, user.credential.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    access = create_access_token(user.id, user.email, user.role.name)
    refresh = create_refresh_token(user.id)
    set_auth_cookies(response, access, refresh)
    return await serialize_user(user, db)

@api_router.post("/auth/logout")
async def logout(response: Response):
    clear_auth_cookies(response)
    return {"ok": True}

@api_router.post("/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordIn, db: AsyncSession = Depends(get_db)):
    email = payload.email.lower().strip()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if not user:
        return {"ok": True, "message": "Si el correo está registrado, se enviará un código de recuperación."}
    
    code = "".join(str(secrets.randbelow(10)) for _ in range(6))
    expiration = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
    
    # delete old ones
    await db.execute(delete(PasswordReset).where(PasswordReset.user_id == user.id))
    
    pr = PasswordReset(
        id=str(uuid.uuid4()),
        user_id=user.id,
        code=code,
        expires_at=expiration
    )
    db.add(pr)
    await db.commit()
    
    # Aesthetic HTML Email
    html_content = f"""
    <div style="font-family: 'Inter', sans-serif; max-width: 500px; margin: 0 auto; background-color: #0f0f11; color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #27272a;">
        <div style="padding: 32px; text-align: center; border-bottom: 1px solid #27272a; background: linear-gradient(180deg, rgba(168, 85, 247, 0.1) 0%, rgba(15, 15, 17, 0) 100%);">
            <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Gym<span style="color: #a855f7;">Nite</span></h1>
        </div>
        <div style="padding: 40px 32px;">
            <h2 style="margin-top: 0; font-size: 18px; font-weight: 600;">Recuperación de contraseña</h2>
            <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6;">Hola {user.name}, recibimos una solicitud para restablecer tu contraseña. Ingresa el siguiente código de 6 dígitos en la aplicación:</p>
            
            <div style="margin: 32px 0; padding: 24px; background-color: #000000; border: 1px solid #27272a; border-radius: 12px; text-align: center;">
                <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #c084fc;">{code}</span>
            </div>
            
            <p style="color: #71717a; font-size: 12px; margin-bottom: 0;">Este código expirará en 15 minutos.</p>
            <p style="color: #71717a; font-size: 12px; margin-top: 4px;">Si no fuiste tú, puedes ignorar este correo de forma segura.</p>
        </div>
    </div>
    """
    
    try:
        resend.Emails.send({
            "from": email_from,
            "to": email,
            "subject": "Gymnite - Tu código de recuperación",
            "html": html_content
        })
    except Exception as e:
        logger.error(f"Error sending reset email: {e}")
        raise HTTPException(status_code=500, detail="Error enviando el correo de recuperación.")
        
    return {"ok": True, "message": "Si el correo está registrado, se enviará un código de recuperación."}

@api_router.post("/auth/reset-password")
async def reset_password(payload: ResetPasswordIn, db: AsyncSession = Depends(get_db)):
    email = payload.email.lower().strip()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=400, detail="El código es incorrecto.")
        
    res_pr = await db.execute(select(PasswordReset).where(PasswordReset.user_id == user.id, PasswordReset.code == payload.code))
    pr = res_pr.scalar_one_or_none()
    
    if not pr:
        raise HTTPException(status_code=400, detail="El código es incorrecto.")
        
    expiration = datetime.fromisoformat(pr.expires_at)
    if datetime.now(timezone.utc) > expiration:
        raise HTTPException(status_code=400, detail="El código ha expirado.")
            
    res_cred = await db.execute(select(UserCredential).where(UserCredential.user_id == user.id))
    cred = res_cred.scalar_one_or_none()
    if cred:
        cred.password_hash = hash_password(payload.new_password)
    else:
        cred = UserCredential(id=str(uuid.uuid4()), user_id=user.id, password_hash=hash_password(payload.new_password))
        db.add(cred)
        
    await db.execute(delete(PasswordReset).where(PasswordReset.user_id == user.id))
    await db.commit()
    
    return {"ok": True, "message": "Contraseña actualizada exitosamente."}

@api_router.get("/auth/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return await serialize_user(user, db)

@api_router.post("/me/dismiss-notification", response_model=UserOut)
async def dismiss_notification(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user.last_admin_action = None
    user.last_admin_action_at = None
    await db.commit()
    await db.refresh(user)
    return await serialize_user(user, db)

@api_router.post("/me/change-email", response_model=UserOut)
async def change_email(payload: ChangeEmailIn, response: Response, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    res_cred = await db.execute(select(UserCredential).where(UserCredential.user_id == user.id))
    cred = res_cred.scalar_one_or_none()
    if not cred or not verify_password(payload.current_password, cred.password_hash):
        raise HTTPException(status_code=401, detail="La contraseña actual es incorrecta.")
        
    if user.email_changes_count >= 3:
        raise HTTPException(status_code=400, detail="Has alcanzado el límite máximo de 3 cambios de correo por cuenta por seguridad.")
        
    new_email_clean = payload.new_email.lower().strip()
    if new_email_clean == user.email:
        raise HTTPException(status_code=400, detail="El nuevo correo es igual al actual.")
        
    result = await db.execute(select(User).where(User.email == new_email_clean))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="El correo ingresado ya está en uso.")
        
    user.email = new_email_clean
    user.email_changes_count += 1
    await db.commit()
    await db.refresh(user)
    
    clear_auth_cookies(response)
    return await serialize_user(user, db)

# ----------------- Receipts -----------------
@api_router.post("/receipts/upload", response_model=UserOut)
async def upload_receipt(
    file: UploadFile = File(...),
    plan_months: Optional[int] = Form(None),
    plan_type: Optional[str] = Form("pesas"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if file.content_type not in ("image/jpeg", "image/jpg"):
        raise HTTPException(status_code=400, detail="Solo se permiten imágenes JPG")
    if plan_months is not None and plan_months not in (1, 3, 6, 12):
        raise HTTPException(status_code=400, detail="Plan inválido. Valores permitidos: 1, 3, 6, 12 meses")
    if plan_type not in ("pesas", "clases", "premium"):
        raise HTTPException(status_code=400, detail="Tipo de plan inválido")
    
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="La imagen no debe superar 5MB")
    if len(data) < 100:
        raise HTTPException(status_code=400, detail="Archivo inválido")
    
    b64 = "data:image/jpeg;base64," + base64.b64encode(data).decode("utf-8")
    now = datetime.now(timezone.utc).isoformat()
    
    receipt = PaymentReceipt(
        id=str(uuid.uuid4()),
        user_id=user.id,
        receipt_image=b64,
        requested_plan_type=plan_type,
        requested_plan_months=plan_months or 1,
        uploaded_at=now,
        status="pending"
    )
    db.add(receipt)
        
    await db.commit()
    await db.refresh(user)
    return await serialize_user(user, db)

# ----------------- Admin -----------------
@api_router.get("/admin/users", response_model=List[UserOut])
async def get_all_users(user: User = Depends(require_coach_or_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.role_id != (select(Role.id).where(Role.name == "admin").scalar_subquery())).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return [await serialize_user(u, db) for u in users]

@api_router.get("/admin/users/{user_id}/receipt")
async def get_receipt(user_id: str, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    u = result.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    result_rec = await db.execute(select(PaymentReceipt).where(PaymentReceipt.user_id == user_id).order_by(desc(PaymentReceipt.uploaded_at)).limit(1))
    latest_receipt = result_rec.scalar_one_or_none()
    
    if not latest_receipt or not latest_receipt.receipt_image:
        raise HTTPException(status_code=404, detail="No hay comprobante para este usuario")
    return {"name": u.name, "email": u.email, "image": latest_receipt.receipt_image}

@api_router.post("/admin/users/{user_id}/approve", response_model=UserOut)
async def approve_user(user_id: str, payload: ApproveIn, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    if payload.plan_months not in (1, 3, 6, 12):
        raise HTTPException(status_code=400, detail="Duración inválida. Valores permitidos: 1, 3, 6 o 12 meses")
    if payload.plan_type not in ("pesas", "clases", "premium"):
        raise HTTPException(status_code=400, detail="Tipo de plan inválido")
    
    result = await db.execute(select(User).where(User.id == user_id))
    u = result.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if u.role.name == "admin":
        raise HTTPException(status_code=400, detail="No se puede modificar al administrador")
    
    now = datetime.now(timezone.utc)
    expires = now + timedelta(days=30 * payload.plan_months)
    
    # approve pending receipt
    result_rec = await db.execute(select(PaymentReceipt).where(PaymentReceipt.user_id == user_id, PaymentReceipt.status == "pending"))
    rec = result_rec.scalar_one_or_none()
    if rec:
        rec.status = "approved"
        rec.reviewed_at = now.isoformat()
        
    sub = Subscription(
        id=str(uuid.uuid4()),
        user_id=user_id,
        plan_type=payload.plan_type,
        plan_months=payload.plan_months,
        started_at=now.isoformat(),
        expires_at=expires.isoformat(),
        is_active=True
    )
    db.add(sub)
    
    await db.commit()
    await db.refresh(u)
    return await serialize_user(u, db)

@api_router.post("/admin/users/{user_id}/reject", response_model=UserOut)
async def reject_user(user_id: str, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    u = result.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if u.role.name == "admin":
        raise HTTPException(status_code=400, detail="No se puede modificar al administrador")
    
    result_rec = await db.execute(select(PaymentReceipt).where(PaymentReceipt.user_id == user_id, PaymentReceipt.status == "pending"))
    rec = result_rec.scalar_one_or_none()
    now = datetime.now(timezone.utc)
    if rec:
        rec.status = "rejected"
        rec.reviewed_at = now.isoformat()
    
    await db.commit()
    await db.refresh(u)
    return await serialize_user(u, db)

@api_router.post("/admin/users/manual", response_model=UserOut)
async def create_manual_user(
    name: str = Form(...),
    email: Optional[str] = Form(None),
    role: str = Form("user"),
    file: Optional[UploadFile] = File(None),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    name_clean = name.strip()
    if len(name_clean) < 2:
        raise HTTPException(status_code=400, detail="Nombre demasiado corto")
    
    if role not in ["user", "coach", "admin"]:
        raise HTTPException(status_code=400, detail="Rol inválido")
    
    email_clean = (email or "").strip().lower() or None
    if email_clean:
        result = await db.execute(select(User).where(User.email == email_clean))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Ya existe un usuario con ese correo")

    receipt_b64 = None
    receipt_at = None
    status = "subscribed" if role in ["coach", "admin"] else "no_subscribed"
    
    if file is not None:
        if file.content_type not in ("image/jpeg", "image/jpg"):
            raise HTTPException(status_code=400, detail="Solo se permiten imágenes JPG")
        data = await file.read()
        if len(data) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="La imagen no debe superar 5MB")
        if len(data) < 100:
            raise HTTPException(status_code=400, detail="Archivo inválido")
        receipt_b64 = "data:image/jpeg;base64," + base64.b64encode(data).decode("utf-8")
        receipt_at = datetime.now(timezone.utc).isoformat()
        status = "pending"

    user_id = str(uuid.uuid4())
    result_role = await db.execute(select(Role).where(Role.name == role))
    user_role = result_role.scalar_one_or_none()
        
    new_user = User(
        id=user_id,
        name=name_clean,
        email=email_clean,
        role_id=user_role.id if user_role else None,
        created_at=datetime.now(timezone.utc).isoformat(),
        email_changes_count=0
    )
    db.add(new_user)
    
    if receipt_b64:
        receipt = PaymentReceipt(
            id=str(uuid.uuid4()),
            user_id=user_id,
            receipt_image=receipt_b64,
            requested_plan_type="pesas",
            requested_plan_months=1,
            uploaded_at=receipt_at,
            status="pending"
        )
        db.add(receipt)
        
    if role in ["coach", "admin"]:
        sub = Subscription(
            id=str(uuid.uuid4()),
            user_id=user_id,
            plan_type="premium",
            plan_months=1200,
            started_at=datetime.now(timezone.utc).isoformat(),
            expires_at=(datetime.now(timezone.utc) + timedelta(days=36500)).isoformat(),
            is_active=True
        )
        db.add(sub)
    
    # We remove the db.add(new_user) from below since we just did it
    await db.commit()
    await db.refresh(new_user)
    return await serialize_user(new_user, db)

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    u = result.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if u.role.name == "admin":
        raise HTTPException(status_code=400, detail="No se puede eliminar al administrador")
    
    await db.delete(u)
    await db.commit()
    return {"ok": True, "deleted": user_id, "name": u.name}

@api_router.get("/admin/stats")
async def admin_stats(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.role_id == (select(Role.id).where(Role.name == "user").scalar_subquery())))
    users = result.scalars().all()
    
    no_sub = 0
    pending = 0
    subscribed = 0
    
    for u in users:
        s_user = await serialize_user(u, db)
        if s_user["status"] == "subscribed":
            subscribed += 1
        elif s_user["status"] == "pending":
            pending += 1
        else:
            no_sub += 1
            
    return {"no_subscribed": no_sub, "pending": pending, "subscribed": subscribed}

@api_router.get("/admin/reports")
async def admin_reports(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result_total = await db.execute(select(User).where(User.role_id == (select(Role.id).where(Role.name == "user").scalar_subquery())))
    all_users = result_total.scalars().all()
    total_users = len(all_users)

    active_users_list = []
    for u in all_users:
        s_user = await serialize_user(u, db)
        if s_user["status"] == "subscribed":
            active_users_list.append(s_user)
            
    active_users = len(active_users_list)
    
    mrr = 0
    revenue_by_plan = {"pesas": 0, "clases": 0, "premium": 0}
    plan_prices = {
        "pesas": {1: 25, 3: 69, 6: 129, 12: 230},
        "clases": {1: 25, 3: 69, 6: 129, 12: 230},
        "premium": {1: 45, 3: 125, 6: 239, 12: 440}
    }
    
    now = datetime.now(timezone.utc)
    next_30 = now + timedelta(days=30)
    expiring_soon = 0
    
    for u in active_users_list:
        ptype = u["plan_type"] or "pesas"
        pmonths = u["plan_months"] or 1
        price = plan_prices.get(ptype, plan_prices["pesas"]).get(pmonths, 25)
        monthly_value = price / pmonths
        mrr += monthly_value
        if ptype in revenue_by_plan:
            revenue_by_plan[ptype] += monthly_value
            
        if u["plan_expires_at"]:
            try:
                exp_date_str = u["plan_expires_at"].replace("Z", "+00:00")
                exp_date = datetime.fromisoformat(exp_date_str)
                if exp_date.tzinfo is None:
                    exp_date = exp_date.replace(tzinfo=timezone.utc)
                if now <= exp_date <= next_30:
                    expiring_soon += 1
            except Exception:
                pass

    thirty_days_ago = (now - timedelta(days=30)).strftime("%Y-%m-%d")
    result_att = await db.execute(select(Attendance.timestamp).where(Attendance.timestamp >= thirty_days_ago))
    attendance_data = result_att.scalars().all()
    
    trend_dict = {}
    for ts in attendance_data:
        date_str = ts.split("T")[0]
        trend_dict[date_str] = trend_dict.get(date_str, 0) + 1
        
    filled_trend = []
    for i in range(30):
        d = (now - timedelta(days=29 - i)).strftime("%Y-%m-%d")
        filled_trend.append({"date": d, "count": trend_dict.get(d, 0)})

    return {
        "total_users": total_users,
        "active_users": active_users,
        "mrr": round(mrr, 2),
        "revenue_by_plan": {k: round(v, 2) for k, v in revenue_by_plan.items()},
        "expiring_soon": expiring_soon,
        "attendance_trend": filled_trend
    }

# ----------------- Attendance -----------------
@api_router.post("/attendance", response_model=AttendanceOut)
async def check_in(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user.status != "subscribed":
        raise HTTPException(status_code=403, detail="Suscripción inactiva. No puedes registrar asistencia.")
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Check if already checked in today
    result = await db.execute(select(Attendance).where(Attendance.user_id == user.id, Attendance.date == today))
    existing = result.scalar_one_or_none()
    
    if existing:
        raise HTTPException(status_code=400, detail="Ya registraste tu asistencia hoy.")
        
    new_attendance = Attendance(
        id=str(uuid.uuid4()),
        user_id=user.id,
        date=today,
        timestamp=datetime.now(timezone.utc).isoformat()
    )
    db.add(new_attendance)
    await db.commit()
    await db.refresh(new_attendance)
    return new_attendance

@api_router.get("/attendance/me", response_model=List[AttendanceOut])
async def get_my_attendance(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Attendance).where(Attendance.user_id == user.id).order_by(Attendance.date.desc()))
    return result.scalars().all()

# ----------------- Physical Evaluations -----------------
@api_router.post("/evaluations", response_model=PhysicalEvaluationOut)
async def add_evaluation(payload: PhysicalEvaluationIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    new_eval = PhysicalEvaluation(
        id=str(uuid.uuid4()),
        user_id=user.id,
        date=payload.date,
        weight_kg=payload.weight_kg,
        body_fat_pct=payload.body_fat_pct,
        muscle_mass_kg=payload.muscle_mass_kg,
        notes=payload.notes
    )
    db.add(new_eval)
    await db.commit()
    await db.refresh(new_eval)
    return new_eval

@api_router.get("/evaluations/me", response_model=List[PhysicalEvaluationOut])
async def get_my_evaluations(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PhysicalEvaluation).where(PhysicalEvaluation.user_id == user.id).order_by(PhysicalEvaluation.date.asc()))
    return result.scalars().all()

# ----------------- Routines -----------------

async def build_routine_out(r: Routine, db: AsyncSession) -> RoutineOut:
    result = await db.execute(
        select(RoutineExercise, Exercise)
        .join(Exercise, RoutineExercise.exercise_id == Exercise.id)
        .where(RoutineExercise.routine_id == r.id)
    )
    rows = result.all()
    
    import re
    clean_objective = re.sub(r'\[ACTIVE:\d{4}-\d{2}-\d{2}\]\s*', '', r.objective or '')
    
    exercises_out = []
    for rx, ex in rows:
        exercises_out.append(RoutineExerciseOut(
            id=rx.id,
            routine_id=rx.routine_id,
            name=ex.name,
            sets=rx.sets,
            reps=rx.reps,
            rest_seconds=rx.rest_seconds,
            image_url=ex.image_url
        ))
        
    return RoutineOut(
        id=r.id,
        user_id=r.user_id or "",
        name=r.name,
        objective=clean_objective,
        exercises=exercises_out
    )

@api_router.get("/routines/me", response_model=List[RoutineOut])
async def get_my_routines(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from datetime import date
    today_str = date.today().isoformat()
    
    # 1. Fetch the Active General Routine (if any)
    result_gen = await db.execute(select(Routine).where(Routine.user_id == None))
    general_routines = result_gen.scalars().all()
    active_today = None
    if general_routines:
        active_today = next((r for r in general_routines if r.objective and f"[ACTIVE:{today_str}]" in r.objective), None)

    routines = []
    
    if user.plan_type == "premium":
        # Premium users get custom routines PLUS the active general routine
        result = await db.execute(select(Routine).where(Routine.user_id == user.id))
        user_routines = result.scalars().all()
        if active_today:
            routines.append(active_today)
        routines.extend(user_routines)
    else:
        # Standard users get the active general routine or a random one
        if active_today:
            routines = [active_today]
        elif general_routines:
            import random
            random.seed(date.today().toordinal())
            routines = [random.choice(general_routines)]
    
    # We removed the default routine creation because it's buggy and we already have a seed script for defaults.
    
    out = []
    for r in routines:
        out.append(await build_routine_out(r, db))
    return out

@api_router.post("/routines/generate-ai", response_model=RoutineOut)
async def generate_ai_routine(payload: GenerateRoutineIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OpenAI API Key no configurada en el servidor")
        
    client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
    
    prompt = f"""
    Eres un entrenador personal experto de élite. Crea una rutina de exactamente 5 ejercicios basada estrictamente en estos parámetros:
    - Músculo(s) Objetivo: {payload.muscle}
    - Nivel del Usuario: {payload.level}
    - Tiempo Disponible: {payload.time}
    - Objetivo Principal: {payload.goal}
    - Lesiones/Limitaciones: {payload.injuries if payload.injuries else "Ninguna"}

    REGLAS ESTRICTAS:
    1. Si es "Principiante", usa máquinas, ejercicios simples y menos series.
    2. Si es "Avanzado", incluye pesos libres, superseries y ejercicios complejos.
    3. Si el tiempo es "Express", asigna súper-series (circuitos) y descansos muy cortos (30s).
    4. Si el objetivo es "Fuerza", asigna rangos de 3-5 reps con descansos largos (2-3 min).
    5. EVITA POR COMPLETO ejercicios que afecten negativamente la zona mencionada en "Lesiones".
    6. Si incluyes ejercicios de CARDIO (bicicleta, caminadora, elíptica), asigna `sets` a 1 y usa el campo `reps` para indicar el número de MINUTOS (ej. reps: 15, reps: 20).
    
    Responde ÚNICAMENTE con un objeto JSON válido con esta estructura exacta, sin markdown, sin texto adicional:
    {{
      "name": "AI: {payload.muscle}",
      "objective": "{payload.goal} - {payload.level}",
      "exercises": [
        {{"name": "Nombre Ejercicio 1", "sets": 4, "reps": 12, "rest_seconds": "60s"}},
        ... 4 ejercicios más ...
      ]
    }}
    """
    
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        content = response.choices[0].message.content
        import json
        data = json.loads(content)
        
        new_routine = Routine(
            id=str(uuid.uuid4()),
            user_id=user.id,
            name=f"AI: {payload.muscle.title().strip()}",
            objective=data.get("objective", "Entrenamiento generado por IA")
        )
        db.add(new_routine)
        
        exercises_out = []
        
        # Load and map wger images
        def get_wger_image(name: str):
            lower_name = name.lower().strip()
            
            # 1. Exact match
            if lower_name in wger_images:
                return wger_images[lower_name]
                
            # 2. Word overlap fuzzy match
            def clean_words(text):
                t = text.replace("-", "").replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
                return set([w for w in t.split() if len(w) > 3]) # Only meaningful words > 3 chars
                
            name_words = clean_words(lower_name)
            if not name_words:
                return None
                
            best_match = None
            best_score = 0
            
            for key, img in wger_images.items():
                key_words = clean_words(key)
                overlap = len(name_words.intersection(key_words))
                if overlap > best_score and overlap >= 1:
                    best_score = overlap
                    best_match = img
                    
            if not best_match:
                return f"DEBUG_NO_MATCH_FOR_WORDS_{list(name_words)}"
            return best_match
            
        exercises_out = []
        for ex in data.get("exercises", [])[:5]:
            ex_name = ex.get("name", "Ejercicio")
            
            # Buscamos o creamos el ejercicio
            result_ex = await db.execute(select(Exercise).where(Exercise.name == ex_name))
            ex_obj = result_ex.scalar_one_or_none()
            if not ex_obj:
                ex_obj = Exercise(
                    id=str(uuid.uuid4()),
                    name=ex_name,
                    
                    image_url=get_wger_image(ex_name)
                )
                db.add(ex_obj)
                await db.flush() # Para obtener el ID
                
            new_ex = RoutineExercise(
                id=str(uuid.uuid4()),
                routine_id=new_routine.id,
                exercise_id=ex_obj.id,
                sets=ex.get("sets", 3),
                reps=ex.get("reps", 10),
                rest_seconds=ex.get("rest_seconds", "60s")
            )
            # Para la respuesta al frontend, necesitamos inyectarle los campos visuales
            new_ex.name = ex_obj.name
            new_ex.image_url = ex_obj.image_url
            
            db.add(new_ex)
            exercises_out.append(new_ex)
            
        await db.commit()
        await db.refresh(new_routine)
        
        return RoutineOut(
            id=new_routine.id,
            user_id=new_routine.user_id or "",
            name=new_routine.name,
            objective=new_routine.objective,
            exercises=[RoutineExerciseOut(
                id=e.id, routine_id=e.routine_id, name=e.name, sets=e.sets, reps=e.reps, rest_seconds=e.rest_seconds, image_url=e.image_url
            ) for e in exercises_out]
        )
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error generando rutina IA: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error AI: {str(e)}")

@api_router.post("/routines", response_model=RoutineOut)
async def create_routine(data: RoutineIn, user: User = Depends(require_coach_or_admin), db: AsyncSession = Depends(get_db)):
    new_routine = Routine(id=str(uuid.uuid4()), user_id=data.user_id, name=data.name, objective=data.objective)
    db.add(new_routine)
    await db.commit()
    await db.refresh(new_routine)
    return RoutineOut(id=new_routine.id, user_id=new_routine.user_id or "", name=new_routine.name, objective=new_routine.objective, exercises=[])

@api_router.post("/routines/{routine_id}/exercises", response_model=RoutineExerciseOut)
async def add_routine_exercise(routine_id: str, data: RoutineExerciseIn, user: User = Depends(require_coach_or_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Routine).where(Routine.id == routine_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Rutina no encontrada")
    new_ex = RoutineExercise(id=str(uuid.uuid4()), routine_id=routine_id, name=data.name, sets=data.sets, reps=data.reps, rest_seconds=data.rest_seconds, image_url=data.image_url)
    db.add(new_ex)
    await db.commit()
    await db.refresh(new_ex)
    return RoutineExerciseOut(id=new_ex.id, routine_id=new_ex.routine_id, name=new_ex.name, sets=new_ex.sets, reps=new_ex.reps, rest_seconds=new_ex.rest_seconds, image_url=new_ex.image_url)

@api_router.get("/routines/general", response_model=List[RoutineOut])
async def get_general_routines(user: User = Depends(require_coach_or_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Routine).where(Routine.user_id == None))
    routines = result.scalars().all()
    out = []
    for r in routines:
        out.append(await build_routine_out(r, db))
    return out

@api_router.get("/routines/user/{user_id}", response_model=List[RoutineOut])
async def get_user_routines(user_id: str, user: User = Depends(require_coach_or_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Routine).where(Routine.user_id == user_id))
    routines = result.scalars().all()
    out = []
    for r in routines:
        out.append(await build_routine_out(r, db))
    return out

@api_router.delete("/routines/{routine_id}")
async def delete_routine(routine_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Routine).where(Routine.id == routine_id))
    routine = result.scalar_one_or_none()
    if not routine:
        raise HTTPException(status_code=404, detail="Rutina no encontrada")
        
    if routine.user_id != user.id and user.role not in ["admin", "coach"]:
        raise HTTPException(status_code=403, detail="No tienes permisos para borrar esta rutina")
        
    await db.execute(delete(RoutineExercise).where(RoutineExercise.routine_id == routine_id))
    await db.execute(delete(Routine).where(Routine.id == routine_id))
    await db.commit()
    return {"status": "ok"}

@api_router.post("/routines/general/{routine_id}/set-active")
async def set_active_general_routine(routine_id: str, user: User = Depends(require_coach_or_admin), db: AsyncSession = Depends(get_db)):
    from datetime import date
    import re
    today_str = date.today().isoformat()
    
    result = await db.execute(select(Routine).where(Routine.user_id == None))
    general_routines = result.scalars().all()
    
    target_routine = None
    for r in general_routines:
        if r.objective:
            r.objective = re.sub(r'\[ACTIVE:\d{4}-\d{2}-\d{2}\]\s*', '', r.objective)
        if r.id == routine_id:
            target_routine = r
            
    if not target_routine:
        raise HTTPException(status_code=404, detail="Rutina general no encontrada")
        
    target_routine.objective = f"[ACTIVE:{today_str}] " + (target_routine.objective or "")
    await db.commit()
    return {"status": "ok", "message": "Rutina asignada para hoy"}


# ----------------- Class Reservations -----------------
@api_router.post("/classes/reserve", response_model=ReservationOut)
async def reserve_class(payload: ReservationIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from datetime import date, datetime, timedelta
    
    # Check if reserving for a shift that already passed today (Assuming GMT-5 / Peru Time)
    now_local = datetime.utcnow() - timedelta(hours=5)
    today_str = now_local.date().isoformat()
    
    if payload.date < today_str:
        raise HTTPException(status_code=400, detail="No puedes reservar para días pasados.")
        
    if payload.date == today_str:
        current_hour = now_local.hour
        if payload.shift == "morning" and current_hour >= 11:
            raise HTTPException(status_code=400, detail="El turno de la mañana de hoy ya finalizó.")
        if payload.shift == "evening" and current_hour >= 20:
            raise HTTPException(status_code=400, detail="El turno de la tarde de hoy ya finalizó.")
        if payload.shift == "saturday" and current_hour >= 23:
            raise HTTPException(status_code=400, detail="El turno de hoy ya finalizó.")

    # Check if already reserved
    existing = await db.execute(select(ClassReservation).where(ClassReservation.user_id == user.id, ClassReservation.date == payload.date, ClassReservation.shift == payload.shift))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Ya tienes una reserva para este turno.")
        
    res = ClassReservation(
        id=str(uuid.uuid4()),
        user_id=user.id,
        date=payload.date,
        shift=payload.shift,
        created_at=datetime.now(timezone.utc).isoformat()
    )
    db.add(res)
    await db.commit()
    await db.refresh(res)
    return res

@api_router.get("/classes/my-reservations", response_model=List[ReservationOut])
async def get_my_reservations(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(ClassReservation).where(ClassReservation.user_id == user.id).order_by(ClassReservation.date.desc()))
    return res.scalars().all()

@api_router.get("/classes/admin/reservations", response_model=List[AdminReservationOut])
async def get_all_reservations(date: str, admin: User = Depends(require_coach_or_admin), db: AsyncSession = Depends(get_db)):
    stmt = select(ClassReservation, User).outerjoin(User, ClassReservation.user_id == User.id).where(ClassReservation.date == date).order_by(ClassReservation.created_at.desc())
    result = await db.execute(stmt)
    out = []
    for res, usr in result:
        out.append(AdminReservationOut(
            id=res.id,
            date=res.date,
            shift=res.shift,
            user_id=res.user_id,
            user_name=usr.name if usr else "Desconocido",
            user_email=usr.email if usr else "",
            created_at=res.created_at
        ))
    return out

# ----------------- Hardware / RFID -----------------

class AssignCardIn(BaseModel):
    userId: str
    rfidUid: str

@api_router.post("/hardware/assign-card")
async def assign_card(payload: AssignCardIn, admin: User = Depends(require_coach_or_admin), db: AsyncSession = Depends(get_db)):
    # Check if card is already in use
    res = await db.execute(select(User).where(User.rfid_uid == payload.rfidUid))
    existing = res.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Esta tarjeta ya está asignada a otro usuario.")
    
    # Assign to user
    res = await db.execute(select(User).where(User.id == payload.userId))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    
    user.rfid_uid = payload.rfidUid
    await db.commit()
    return {"message": "Tarjeta vinculada exitosamente", "name": user.name}

@api_router.get("/hardware/verify-access")
async def verify_access(rfidUid: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.rfid_uid == rfidUid))
    user = res.scalar_one_or_none()
    
    if not user:
        return {"status": "NOT_FOUND"}
    
    # Check active subscription
    sub_res = await db.execute(select(Subscription).where(Subscription.user_id == user.id, Subscription.is_active == True))
    active_subs = sub_res.scalars().all()
    
    status = "EXPIRED"
    expires_at = None
    
    if active_subs:
        # Find the one with the furthest expiry date
        furthest_sub = max(active_subs, key=lambda s: datetime.fromisoformat(s.expires_at) if s.expires_at else datetime.min)
        expires_at = furthest_sub.expires_at
        
        # Check if it's actually in the future
        if expires_at:
            exp_date = datetime.fromisoformat(expires_at)
            if exp_date > datetime.now(timezone.utc):
                status = "ACTIVE"
                
                # Log attendance
                attendance = Attendance(
                    id=str(uuid.uuid4()),
                    user_id=user.id,
                    timestamp=datetime.now(timezone.utc).isoformat()
                )
                db.add(attendance)
                await db.commit()

    return {
        "id": user.id,
        "name": user.name,
        "status": status,
        "membershipExpires": expires_at
    }

# ----------------- Health -----------------
@api_router.get("/")
async def root():
    return {"app": "GymNite", "status": "ok"}

# ----------------- Mount -----------------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.environ.get("FRONTEND_URL", "http://localhost:3000"),
        "http://localhost:3000",
    ],
    allow_origin_regex=r"https://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Seed -----------------
import json
import os



@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Handle migration for image_url
        try:
            from sqlalchemy import text
            await conn.execute(text("ALTER TABLE routine_exercises ADD COLUMN image_url VARCHAR"))
        except Exception:
            pass
        
    async with engine.connect() as conn:
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN plan_type VARCHAR DEFAULT 'pesas'"))
            await conn.commit()
        except Exception:
            await conn.rollback()
            
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN requested_plan_type VARCHAR"))
            await conn.commit()
        except Exception:
            await conn.rollback()
            
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN email_changes_count INTEGER DEFAULT 0"))
            await conn.commit()
        except Exception:
            await conn.rollback()
            
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN rfid_uid VARCHAR UNIQUE"))
            await conn.commit()
        except Exception:
            await conn.rollback()
        
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@gymnite.com").lower().strip()
    admin_password = os.environ.get("ADMIN_PASSWORD", "12345")
    
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == admin_email))
        existing = result.scalar_one_or_none()
        
        if existing is None:
            # We don't need to auto-seed here because seed_admin.py handles it
            pass
        else:
            # We skip password check in startup to avoid complexity, seed_admin handles the admin.
            pass

@app.on_event("shutdown")
async def on_shutdown():
    await engine.dispose()
