from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

# ----------------- Config -----------------
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 60 * 24  # 1 day
REFRESH_TOKEN_DAYS = 7

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI()
api_router = APIRouter(prefix="/api")
logger = logging.getLogger("gymnite")
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

# ----------------- Helpers -----------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

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

def serialize_user(u: dict) -> dict:
    return {
        "id": u["id"],
        "name": u["name"],
        "email": u.get("email"),
        "role": u["role"],
        "status": u.get("status", "no_subscribed"),
        "has_receipt": bool(u.get("receipt_image")),
        "receipt_uploaded_at": u.get("receipt_uploaded_at"),
        "approved_at": u.get("approved_at"),
        "created_at": u.get("created_at"),
        "manual": bool(u.get("manual", False)),
        "plan_months": u.get("plan_months"),
        "plan_started_at": u.get("plan_started_at"),
        "plan_expires_at": u.get("plan_expires_at"),
        "requested_plan_months": u.get("requested_plan_months"),
    }

async def get_current_user(request: Request) -> dict:
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
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
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

class ApproveIn(BaseModel):
    plan_months: int = Field(..., description="Allowed values: 1, 3, 6, 12")

# ----------------- Auth Endpoints -----------------
@api_router.post("/auth/register", response_model=UserOut)
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "name": payload.name.strip(),
        "email": email,
        "password_hash": hash_password(payload.password),
        "role": "user",
        "status": "no_subscribed",
        "receipt_image": None,
        "receipt_uploaded_at": None,
        "approved_at": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "manual": False,
        "plan_months": None,
        "plan_started_at": None,
        "plan_expires_at": None,
    }
    await db.users.insert_one(doc)
    access = create_access_token(user_id, email, "user")
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    return serialize_user(doc)

@api_router.post("/auth/login", response_model=UserOut)
async def login(payload: LoginIn, response: Response):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    access = create_access_token(user["id"], user["email"], user["role"])
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
    return serialize_user(user)

@api_router.post("/auth/logout")
async def logout(response: Response):
    clear_auth_cookies(response)
    return {"ok": True}

@api_router.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return serialize_user(user)

# ----------------- Receipts -----------------
import base64

@api_router.post("/receipts/upload", response_model=UserOut)
async def upload_receipt(
    file: UploadFile = File(...),
    plan_months: Optional[int] = Form(None),
    user: dict = Depends(get_current_user),
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
    update = {
        "receipt_image": b64,
        "receipt_uploaded_at": now,
        "status": "pending",
    }
    if plan_months is not None:
        update["requested_plan_months"] = plan_months
    await db.users.update_one({"id": user["id"]}, {"$set": update})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return serialize_user(updated)

# ----------------- Admin -----------------
@api_router.get("/admin/users", response_model=List[UserOut])
async def list_users(admin: dict = Depends(require_admin)):
    pipeline = [
        {"$match": {"role": {"$ne": "admin"}}},
        {"$addFields": {"has_receipt_computed": {"$cond": [{"$ifNull": ["$receipt_image", False]}, True, False]}}},
        {"$project": {"_id": 0, "password_hash": 0, "receipt_image": 0}},
        {"$sort": {"created_at": -1}},
    ]
    users = await db.users.aggregate(pipeline).to_list(1000)
    result = []
    for u in users:
        out = serialize_user(u)
        out["has_receipt"] = bool(u.get("has_receipt_computed"))
        result.append(out)
    return result

@api_router.get("/admin/users/{user_id}/receipt")
async def get_receipt(user_id: str, admin: dict = Depends(require_admin)):
    u = await db.users.find_one({"id": user_id}, {"_id": 0, "receipt_image": 1, "name": 1, "email": 1})
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if not u.get("receipt_image"):
        raise HTTPException(status_code=404, detail="No hay comprobante para este usuario")
    return {"name": u.get("name"), "email": u.get("email"), "image": u["receipt_image"]}

@api_router.post("/admin/users/{user_id}/approve", response_model=UserOut)
async def approve_user(user_id: str, payload: ApproveIn, admin: dict = Depends(require_admin)):
    if payload.plan_months not in (1, 3, 6, 12):
        raise HTTPException(status_code=400, detail="Duración inválida. Valores permitidos: 1, 3, 6 o 12 meses")
    u = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if u.get("role") == "admin":
        raise HTTPException(status_code=400, detail="No se puede modificar al administrador")
    now = datetime.now(timezone.utc)
    expires = now + timedelta(days=30 * payload.plan_months)
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "status": "subscribed",
            "approved_at": now.isoformat(),
            "plan_months": payload.plan_months,
            "plan_started_at": now.isoformat(),
            "plan_expires_at": expires.isoformat(),
        }},
    )
    updated = await db.users.find_one({"id": user_id}, {"_id": 0})
    return serialize_user(updated)

@api_router.post("/admin/users/{user_id}/reject", response_model=UserOut)
async def reject_user(user_id: str, admin: dict = Depends(require_admin)):
    u = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if u.get("role") == "admin":
        raise HTTPException(status_code=400, detail="No se puede modificar al administrador")
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "status": "no_subscribed",
            "receipt_image": None,
            "receipt_uploaded_at": None,
            "approved_at": None,
            "plan_months": None,
            "plan_started_at": None,
            "plan_expires_at": None,
        }},
    )
    updated = await db.users.find_one({"id": user_id}, {"_id": 0})
    return serialize_user(updated)

@api_router.post("/admin/users/manual", response_model=UserOut)
async def create_manual_user(
    name: str = Form(...),
    email: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    admin: dict = Depends(require_admin),
):
    name_clean = name.strip()
    if len(name_clean) < 2:
        raise HTTPException(status_code=400, detail="Nombre demasiado corto")
    email_clean = (email or "").strip().lower() or None
    if email_clean:
        existing = await db.users.find_one({"email": email_clean})
        if existing:
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
    doc = {
        "id": user_id,
        "name": name_clean,
        "email": email_clean,
        "password_hash": None,
        "role": "user",
        "status": status,
        "receipt_image": receipt_b64,
        "receipt_uploaded_at": receipt_at,
        "approved_at": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "manual": True,
        "plan_months": None,
        "plan_started_at": None,
        "plan_expires_at": None,
    }
    await db.users.insert_one(doc)
    return serialize_user(doc)

@api_router.get("/admin/stats")
async def admin_stats(admin: dict = Depends(require_admin)):
    no_sub = await db.users.count_documents({"role": "user", "status": "no_subscribed"})
    pending = await db.users.count_documents({"role": "user", "status": "pending"})
    subscribed = await db.users.count_documents({"role": "user", "status": "subscribed"})
    return {"no_subscribed": no_sub, "pending": pending, "subscribed": subscribed}

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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Seed -----------------
@app.on_event("startup")
async def on_startup():
    # Email: unique only when stored as a string (manual users may omit email)
    existing_indexes = await db.users.index_information()
    if "email_1" in existing_indexes and not existing_indexes["email_1"].get("partialFilterExpression"):
        try:
            await db.users.drop_index("email_1")
        except Exception:
            pass
    await db.users.create_index(
        "email",
        unique=True,
        partialFilterExpression={"email": {"$type": "string"}},
    )
    await db.users.create_index("id", unique=True)
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@gymnite.com").lower().strip()
    admin_password = os.environ.get("ADMIN_PASSWORD", "12345")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "name": "Administrador",
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "role": "admin",
            "status": "subscribed",
            "receipt_image": None,
            "receipt_uploaded_at": None,
            "approved_at": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Admin seeded: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password), "role": "admin"}},
        )
        logger.info(f"Admin password updated: {admin_email}")

@app.on_event("shutdown")
async def on_shutdown():
    client.close()
