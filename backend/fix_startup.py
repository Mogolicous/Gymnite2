import os

server_path = os.path.join(os.path.dirname(__file__), 'server.py')
with open(server_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_startup = """        existing = result.scalar_one_or_none()
        
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
            logger.info(f"Admin password updated: {admin_email}")"""
            
new_startup = """        existing = result.scalar_one_or_none()
        
        if existing is None:
            # We don't need to auto-seed here because seed_admin.py handles it
            pass
        else:
            # We skip password check in startup to avoid complexity, seed_admin handles the admin.
            pass"""
content = content.replace(old_startup, new_startup)

with open(server_path, 'w', encoding='utf-8') as f:
    f.write(content)
