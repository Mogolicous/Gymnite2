import os
import re

server_path = os.path.join(os.path.dirname(__file__), 'server.py')

with open(server_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Models
old_models = """class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(80))
    email: Mapped[Optional[str]] = mapped_column(String, unique=True, index=True, nullable=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    role: Mapped[str] = mapped_column(String, default="user")
    created_at: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    email_changes_count: Mapped[int] = mapped_column(Integer, default=0)
    
    password_resets = relationship("PasswordReset", back_populates="user", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="user", cascade="all, delete-orphan")
    payment_receipts = relationship("PaymentReceipt", back_populates="user", cascade="all, delete-orphan")"""

new_models = """class Role(Base):
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
    created_at: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    email_changes_count: Mapped[int] = mapped_column(Integer, default=0)
    
    role = relationship("Role", lazy="joined")
    credential = relationship("UserCredential", back_populates="user", uselist=False, cascade="all, delete-orphan")
    password_resets = relationship("PasswordReset", back_populates="user", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="user", cascade="all, delete-orphan")
    payment_receipts = relationship("PaymentReceipt", back_populates="user", cascade="all, delete-orphan")"""

content = content.replace(old_models, new_models)

# 2. serialize_user
content = content.replace('"role": u.role,', '"role": u.role.name if u.role else "user",')

# 3. register
old_register = """    new_user = User(
        id=user_id,
        name=payload.name.strip(),
        email=email,
        password_hash=hash_password(payload.password),
        role="user",
        created_at=datetime.now(timezone.utc).isoformat(),
        email_changes_count=0
    )"""
new_register = """    result_role = await db.execute(select(Role).where(Role.name == "user"))
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
    db.add(cred)"""
content = content.replace(old_register, new_register)
# Fix the first db.add in register since I added it twice
content = content.replace("    db.add(cred)\n    db.add(new_user)\n    await db.commit()", "    db.add(cred)\n    await db.commit()")

# 4. login
old_login = """    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    access = create_access_token(user.id, user.email, user.role)"""
new_login = """    from sqlalchemy.orm import selectinload
    result = await db.execute(select(User).options(selectinload(User.credential)).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user or not user.credential or not verify_password(payload.password, user.credential.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    access = create_access_token(user.id, user.email, user.role.name)"""
content = content.replace(old_login, new_login)

# 5. create_manual_user
old_manual = """    new_user = User(
        id=user_id,
        name=name_clean,
        email=email_clean,
        password_hash=None,
        role=role,
        created_at=datetime.now(timezone.utc).isoformat(),
        email_changes_count=0
    )"""
new_manual = """    result_role = await db.execute(select(Role).where(Role.name == role))
    user_role = result_role.scalar_one_or_none()
        
    new_user = User(
        id=user_id,
        name=name_clean,
        email=email_clean,
        role_id=user_role.id if user_role else None,
        created_at=datetime.now(timezone.utc).isoformat(),
        email_changes_count=0
    )"""
content = content.replace(old_manual, new_manual)

# 6. admin endpoints that used user.role strings
content = content.replace('if user.role != "admin":', 'if user.role.name != "admin":')
content = content.replace('if user.role not in ["admin", "coach"]:', 'if user.role.name not in ["admin", "coach"]:')
content = content.replace('if u.role == "admin":', 'if u.role.name == "admin":')
content = content.replace('User.role != "admin"', 'User.role_id != (select(Role.id).where(Role.name == "admin").scalar_subquery())')
content = content.replace('User.role == "user"', 'User.role_id == (select(Role.id).where(Role.name == "user").scalar_subquery())')

# 7. reset password
old_reset = """    user.password_hash = hash_password(payload.new_password)
    user.reset_code = None
    user.reset_code_expires_at = None
    await db.commit()"""
new_reset = """    result_cred = await db.execute(select(UserCredential).where(UserCredential.user_id == user.id))
    cred = result_cred.scalar_one_or_none()
    if cred:
        cred.password_hash = hash_password(payload.new_password)
    else:
        cred = UserCredential(
            id=str(uuid.uuid4()),
            user_id=user.id,
            password_hash=hash_password(payload.new_password)
        )
        db.add(cred)
        
    user.reset_code = None
    user.reset_code_expires_at = None
    await db.commit()"""
# Actually, the reset_password code queries User but not the credential. Wait, the reset_code is in PasswordReset table now.
# Wait! In the previous refactor, I moved reset_code to PasswordReset table but I didn't update the reset endpoint properly.
# Let's fix forgot-password and reset-password comprehensively.

old_forgot = """    if not user:
        return {"ok": True, "message": "Si el correo está registrado, se enviará un código de recuperación."}
    
    # Generate 6-digit code
    code = "".join(str(secrets.randbelow(10)) for _ in range(6))
    expiration = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
    
    user.reset_code = code
    user.reset_code_expires_at = expiration
    await db.commit()"""
new_forgot = """    if not user:
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
    await db.commit()"""
content = content.replace(old_forgot, new_forgot)

old_reset_full = """@api_router.post("/auth/reset-password")
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
    
    return {"ok": True, "message": "Contraseña actualizada exitosamente."}"""
new_reset_full = """@api_router.post("/auth/reset-password")
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
    
    return {"ok": True, "message": "Contraseña actualizada exitosamente."}"""
content = content.replace(old_reset_full, new_reset_full)

# Change email validation fix
old_change = """if not verify_password(payload.current_password, user.password_hash):"""
new_change = """    res_cred = await db.execute(select(UserCredential).where(UserCredential.user_id == user.id))
    cred = res_cred.scalar_one_or_none()
    if not cred or not verify_password(payload.current_password, cred.password_hash):"""
content = content.replace(old_change, new_change)

with open(server_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Auth endpoints and models refactored.")
