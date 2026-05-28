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
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base, Mapped, mapped_column
from sqlalchemy import String, Boolean, Integer, Text, Float, ForeignKey, select, update, delete, func

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ----------------- Config -----------------
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 60 * 24  # 1 day
REFRESH_TOKEN_DAYS = 7

# PostgreSQL URL from .env or a default
database_url = os.environ.get("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost/gymnite")

# Resend config
resend.api_key = os.environ.get("RESEND_API_KEY", "")
email_from = os.environ.get("EMAIL_FROM", "onboarding@resend.dev")

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
class User(Base):
    __tablename__ = "users"
    
    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(80))
    email: Mapped[Optional[str]] = mapped_column(String, unique=True, index=True, nullable=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    role: Mapped[str] = mapped_column(String, default="user")
    status: Mapped[str] = mapped_column(String, default="no_subscribed")
    receipt_image: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    receipt_uploaded_at: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    approved_at: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    manual: Mapped[bool] = mapped_column(Boolean, default=False)
    plan_months: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    plan_started_at: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    plan_expires_at: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    requested_plan_months: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    last_admin_action: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    last_admin_action_at: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    reset_code: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    reset_code_expires_at: Mapped[Optional[str]] = mapped_column(String, nullable=True)

class Attendance(Base):
    __tablename__ = "attendance"
    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    date: Mapped[str] = mapped_column(String, index=True)  # Format: YYYY-MM-DD
    timestamp: Mapped[str] = mapped_column(String)

class PhysicalEvaluation(Base):
    __tablename__ = "physical_evaluations"
    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    date: Mapped[str] = mapped_column(String)  # Format: YYYY-MM-DD
    weight_kg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    body_fat_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    muscle_mass_kg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

class Routine(Base):
    __tablename__ = "routines"
    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String)
    objective: Mapped[Optional[str]] = mapped_column(String, nullable=True)

class RoutineExercise(Base):
    __tablename__ = "routine_exercises"
    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    routine_id: Mapped[str] = mapped_column(String, ForeignKey("routines.id"), index=True)
    name: Mapped[str] = mapped_column(String)
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

def serialize_user(u: User) -> dict:
    return {
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "role": u.role,
        "status": u.status,
        "has_receipt": bool(u.receipt_image),
        "receipt_uploaded_at": u.receipt_uploaded_at,
        "approved_at": u.approved_at,
        "created_at": u.created_at,
        "manual": u.manual,
        "plan_months": u.plan_months,
        "plan_started_at": u.plan_started_at,
        "plan_expires_at": u.plan_expires_at,
        "requested_plan_months": u.requested_plan_months,
        "last_admin_action": u.last_admin_action,
        "last_admin_action_at": u.last_admin_action_at,
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
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Se requieren permisos de administrador")
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
    plan_started_at: Optional[str] = None
    plan_expires_at: Optional[str] = None
    requested_plan_months: Optional[int] = None
    last_admin_action: Optional[str] = None
    last_admin_action_at: Optional[str] = None

class ApproveIn(BaseModel):
    plan_months: int = Field(..., description="Allowed values: 1, 3, 6, 12")

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

class RoutineOut(BaseModel):
    id: str
    user_id: str
    name: str
    objective: Optional[str] = None
    exercises: List[RoutineExerciseOut] = []

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

# ----------------- Auth Endpoints -----------------
@api_router.post("/auth/register", response_model=UserOut)
async def register(payload: RegisterIn, response: Response, db: AsyncSession = Depends(get_db)):
    email = payload.email.lower().strip()
    result = await db.execute(select(User).where(User.email == email))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")
    
    user_id = str(uuid.uuid4())
    new_user = User(
        id=user_id,
        name=payload.name.strip(),
        email=email,
        password_hash=hash_password(payload.password),
        role="user",
        status="no_subscribed",
        receipt_image=None,
        receipt_uploaded_at=None,
        approved_at=None,
        created_at=datetime.now(timezone.utc).isoformat(),
        manual=False,
        plan_months=None,
        plan_started_at=None,
        plan_expires_at=None,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    access = create_access_token(user_id, email, "user")
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    return serialize_user(new_user)

@api_router.post("/auth/login", response_model=UserOut)
async def login(payload: LoginIn, response: Response, db: AsyncSession = Depends(get_db)):
    email = payload.email.lower().strip()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    access = create_access_token(user.id, user.email, user.role)
    refresh = create_refresh_token(user.id)
    set_auth_cookies(response, access, refresh)
    return serialize_user(user)

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
    
    # Generate 6-digit code
    code = "".join(str(secrets.randbelow(10)) for _ in range(6))
    expiration = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
    
    user.reset_code = code
    user.reset_code_expires_at = expiration
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
    
    if not user or not user.reset_code or user.reset_code != payload.code:
        raise HTTPException(status_code=400, detail="El código es incorrecto.")
        
    if user.reset_code_expires_at:
        expiration = datetime.fromisoformat(user.reset_code_expires_at)
        if datetime.now(timezone.utc) > expiration:
            raise HTTPException(status_code=400, detail="El código ha expirado.")
            
    user.password_hash = hash_password(payload.new_password)
    user.reset_code = None
    user.reset_code_expires_at = None
    await db.commit()
    
    return {"ok": True, "message": "Contraseña actualizada exitosamente."}

@api_router.get("/auth/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return serialize_user(user)

@api_router.post("/me/dismiss-notification", response_model=UserOut)
async def dismiss_notification(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user.last_admin_action = None
    user.last_admin_action_at = None
    await db.commit()
    await db.refresh(user)
    return serialize_user(user)

# ----------------- Receipts -----------------
@api_router.post("/receipts/upload", response_model=UserOut)
async def upload_receipt(
    file: UploadFile = File(...),
    plan_months: Optional[int] = Form(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if file.content_type not in ("image/jpeg", "image/jpg"):
        raise HTTPException(status_code=400, detail="Solo se permiten imágenes JPG")
    if plan_months is not None and plan_months not in (1, 3, 6, 12):
        raise HTTPException(status_code=400, detail="Plan inválido. Valores permitidos: 1, 3, 6, 12 meses")
    
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="La imagen no debe superar 5MB")
    if len(data) < 100:
        raise HTTPException(status_code=400, detail="Archivo inválido")
    
    b64 = "data:image/jpeg;base64," + base64.b64encode(data).decode("utf-8")
    now = datetime.now(timezone.utc).isoformat()
    
    user.receipt_image = b64
    user.receipt_uploaded_at = now
    user.status = "pending"
    if plan_months is not None:
        user.requested_plan_months = plan_months
        
    await db.commit()
    await db.refresh(user)
    return serialize_user(user)

# ----------------- Admin -----------------
@api_router.get("/admin/users", response_model=List[UserOut])
async def list_users(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.role != "admin").order_by(User.created_at.desc()))
    users = result.scalars().all()
    return [serialize_user(u) for u in users]

@api_router.get("/admin/users/{user_id}/receipt")
async def get_receipt(user_id: str, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    u = result.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if not u.receipt_image:
        raise HTTPException(status_code=404, detail="No hay comprobante para este usuario")
    return {"name": u.name, "email": u.email, "image": u.receipt_image}

@api_router.post("/admin/users/{user_id}/approve", response_model=UserOut)
async def approve_user(user_id: str, payload: ApproveIn, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    if payload.plan_months not in (1, 3, 6, 12):
        raise HTTPException(status_code=400, detail="Duración inválida. Valores permitidos: 1, 3, 6 o 12 meses")
    
    result = await db.execute(select(User).where(User.id == user_id))
    u = result.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if u.role == "admin":
        raise HTTPException(status_code=400, detail="No se puede modificar al administrador")
    
    now = datetime.now(timezone.utc)
    expires = now + timedelta(days=30 * payload.plan_months)
    
    u.status = "subscribed"
    u.approved_at = now.isoformat()
    u.plan_months = payload.plan_months
    u.plan_started_at = now.isoformat()
    u.plan_expires_at = expires.isoformat()
    u.last_admin_action = "approved"
    u.last_admin_action_at = now.isoformat()
    
    await db.commit()
    await db.refresh(u)
    return serialize_user(u)

@api_router.post("/admin/users/{user_id}/reject", response_model=UserOut)
async def reject_user(user_id: str, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    u = result.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if u.role == "admin":
        raise HTTPException(status_code=400, detail="No se puede modificar al administrador")
    
    u.status = "no_subscribed"
    u.receipt_image = None
    u.receipt_uploaded_at = None
    u.approved_at = None
    u.plan_months = None
    u.plan_started_at = None
    u.plan_expires_at = None
    u.requested_plan_months = None
    u.last_admin_action = "rejected"
    u.last_admin_action_at = datetime.now(timezone.utc).isoformat()
    
    await db.commit()
    await db.refresh(u)
    return serialize_user(u)

@api_router.post("/admin/users/manual", response_model=UserOut)
async def create_manual_user(
    name: str = Form(...),
    email: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    name_clean = name.strip()
    if len(name_clean) < 2:
        raise HTTPException(status_code=400, detail="Nombre demasiado corto")
    
    email_clean = (email or "").strip().lower() or None
    if email_clean:
        result = await db.execute(select(User).where(User.email == email_clean))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Ya existe un usuario con ese correo")

    receipt_b64 = None
    receipt_at = None
    status = "no_subscribed"
    
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
    new_user = User(
        id=user_id,
        name=name_clean,
        email=email_clean,
        password_hash=None,
        role="user",
        status=status,
        receipt_image=receipt_b64,
        receipt_uploaded_at=receipt_at,
        approved_at=None,
        created_at=datetime.now(timezone.utc).isoformat(),
        manual=True,
        plan_months=None,
        plan_started_at=None,
        plan_expires_at=None,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return serialize_user(new_user)

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    u = result.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if u.role == "admin":
        raise HTTPException(status_code=400, detail="No se puede eliminar al administrador")
    
    await db.delete(u)
    await db.commit()
    return {"ok": True, "deleted": user_id, "name": u.name}

@api_router.get("/admin/stats")
async def admin_stats(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result_no_sub = await db.execute(select(func.count(User.id)).where(User.role == "user", User.status == "no_subscribed"))
    no_sub = result_no_sub.scalar_one()
    
    result_pending = await db.execute(select(func.count(User.id)).where(User.role == "user", User.status == "pending"))
    pending = result_pending.scalar_one()
    
    result_subscribed = await db.execute(select(func.count(User.id)).where(User.role == "user", User.status == "subscribed"))
    subscribed = result_subscribed.scalar_one()
    
    return {"no_subscribed": no_sub, "pending": pending, "subscribed": subscribed}

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
@api_router.get("/routines/me", response_model=List[RoutineOut])
async def get_my_routines(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Routine).where(Routine.user_id == user.id))
    routines = result.scalars().all()
    
    if not routines:
        # Create a default routine for demonstration if none exists
        default_routine = Routine(
            id=str(uuid.uuid4()),
            user_id=user.id,
            name="Rutina Full Body (Demo)",
            objective="Acondicionamiento General"
        )
        db.add(default_routine)
        
        exercises = [
            RoutineExercise(id=str(uuid.uuid4()), routine_id=default_routine.id, name="Sentadillas libres", sets=4, reps=12, rest_seconds="60s"),
            RoutineExercise(id=str(uuid.uuid4()), routine_id=default_routine.id, name="Press de Banca", sets=4, reps=10, rest_seconds="90s"),
            RoutineExercise(id=str(uuid.uuid4()), routine_id=default_routine.id, name="Remo con barra", sets=4, reps=10, rest_seconds="90s"),
            RoutineExercise(id=str(uuid.uuid4()), routine_id=default_routine.id, name="Plancha Abdominal", sets=3, reps=1, rest_seconds="45s")
        ]
        db.add_all(exercises)
        await db.commit()
        await db.refresh(default_routine)
        routines = [default_routine]
    
    out = []
    for r in routines:
        ex_res = await db.execute(select(RoutineExercise).where(RoutineExercise.routine_id == r.id))
        exercises = ex_res.scalars().all()
        out.append(RoutineOut(
            id=r.id,
            user_id=r.user_id,
            name=r.name,
            objective=r.objective,
            exercises=[RoutineExerciseOut(
                id=e.id, routine_id=e.routine_id, name=e.name, sets=e.sets, reps=e.reps, rest_seconds=e.rest_seconds
            ) for e in exercises]
        ))
    return out

# ----------------- Class Reservations -----------------
@api_router.post("/classes/reserve", response_model=ReservationOut)
async def reserve_class(payload: ReservationIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
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
async def get_all_reservations(date: str, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
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
        "https://gymnite2.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Seed -----------------
@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@gymnite.com").lower().strip()
    admin_password = os.environ.get("ADMIN_PASSWORD", "12345")
    
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == admin_email))
        existing = result.scalar_one_or_none()
        
        if existing is None:
            new_admin = User(
                id=str(uuid.uuid4()),
                name="Administrador",
                email=admin_email,
                password_hash=hash_password(admin_password),
                role="admin",
                status="subscribed",
                receipt_image=None,
                receipt_uploaded_at=None,
                approved_at=None,
                created_at=datetime.now(timezone.utc).isoformat(),
            )
            session.add(new_admin)
            await session.commit()
            logger.info(f"Admin seeded: {admin_email}")
        elif not verify_password(admin_password, existing.password_hash):
            existing.password_hash = hash_password(admin_password)
            existing.role = "admin"
            await session.commit()
            logger.info(f"Admin password updated: {admin_email}")

@app.on_event("shutdown")
async def on_shutdown():
    await engine.dispose()
