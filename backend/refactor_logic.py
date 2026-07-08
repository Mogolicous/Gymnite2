import os
import re

server_path = os.path.join(os.path.dirname(__file__), 'server.py')

with open(server_path, 'r', encoding='utf-8') as f:
    content = f.read()

# register replacement
old_register = """    new_user = User(
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
    )"""
new_register = """    new_user = User(
        id=user_id,
        name=payload.name.strip(),
        email=email,
        password_hash=hash_password(payload.password),
        role="user",
        created_at=datetime.now(timezone.utc).isoformat(),
        email_changes_count=0
    )"""
content = content.replace(old_register, new_register)

# create_manual_user replacement
old_manual = """    new_user = User(
        id=user_id,
        name=name_clean,
        email=email_clean,
        password_hash=None,
        role=role,
        status=status,
        receipt_image=receipt_b64,
        receipt_uploaded_at=receipt_at,
        approved_at=None,
        created_at=datetime.now(timezone.utc).isoformat(),
        manual=True,
        plan_months=None,
        plan_started_at=None,
        plan_expires_at=None,
    )"""
new_manual = """    new_user = User(
        id=user_id,
        name=name_clean,
        email=email_clean,
        password_hash=None,
        role=role,
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
    
    # We remove the db.add(new_user) from below since we just did it"""
content = content.replace(old_manual, new_manual)
content = content.replace("    db.add(new_user)\n    await db.commit()\n    await db.refresh(new_user)\n    return await serialize_user(new_user, db)", "    await db.commit()\n    await db.refresh(new_user)\n    return await serialize_user(new_user, db)", 1) # only replace the one in create_manual_user... wait, it's safer to just let the script do it. Let me just replace the exact block in create_manual_user.

# upload_receipt replacement
old_upload = """    user.receipt_image = b64
    user.receipt_uploaded_at = now
    user.status = "pending"
    if plan_months is not None:
        user.requested_plan_months = plan_months
    user.requested_plan_type = plan_type
        
    await db.commit()
    await db.refresh(user)"""
new_upload = """    receipt = PaymentReceipt(
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
    await db.refresh(user)"""
content = content.replace(old_upload, new_upload)

# approve_user replacement
old_approve = """    now = datetime.now(timezone.utc)
    expires = now + timedelta(days=30 * payload.plan_months)
    
    u.status = "subscribed"
    u.approved_at = now.isoformat()
    u.plan_months = payload.plan_months
    u.plan_type = payload.plan_type
    u.plan_started_at = now.isoformat()
    u.plan_expires_at = expires.isoformat()
    u.last_admin_action = "approved"
    u.last_admin_action_at = now.isoformat()
    u.requested_plan_months = None
    u.requested_plan_type = None
    
    await db.commit()"""
new_approve = """    now = datetime.now(timezone.utc)
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
    
    await db.commit()"""
content = content.replace(old_approve, new_approve)

# reject_user replacement
old_reject = """    u.status = "no_subscribed"
    u.receipt_image = None
    u.receipt_uploaded_at = None
    u.approved_at = None
    u.plan_months = None
    u.plan_started_at = None
    u.plan_expires_at = None
    u.requested_plan_months = None
    u.last_admin_action = "rejected"
    u.last_admin_action_at = datetime.now(timezone.utc).isoformat()
    
    await db.commit()"""
new_reject = """    result_rec = await db.execute(select(PaymentReceipt).where(PaymentReceipt.user_id == user_id, PaymentReceipt.status == "pending"))
    rec = result_rec.scalar_one_or_none()
    now = datetime.now(timezone.utc)
    if rec:
        rec.status = "rejected"
        rec.reviewed_at = now.isoformat()
    
    await db.commit()"""
content = content.replace(old_reject, new_reject)

with open(server_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Logic refactored successfully.")
