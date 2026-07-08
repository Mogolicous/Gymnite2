import os

server_path = os.path.join(os.path.dirname(__file__), 'server.py')

with open(server_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace serialize_user definition
old_serialize = """def serialize_user(u: User) -> dict:
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
        "plan_type": u.plan_type,
        "plan_started_at": u.plan_started_at,
        "plan_expires_at": u.plan_expires_at,
        "requested_plan_months": u.requested_plan_months,
        "requested_plan_type": u.requested_plan_type,
        "last_admin_action": u.last_admin_action,
        "last_admin_action_at": u.last_admin_action_at,
        "email_changes_count": u.email_changes_count,
    }"""

new_serialize = """async def serialize_user(u: User, db: AsyncSession) -> dict:
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
        "role": u.role,
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
        "email_changes_count": u.email_changes_count,
    }"""

content = content.replace(old_serialize, new_serialize)

# 2. Replace callers
content = content.replace("serialize_user(new_user)", "await serialize_user(new_user, db)")
content = content.replace("serialize_user(user)", "await serialize_user(user, db)")
content = content.replace("serialize_user(u)", "await serialize_user(u, db)")
content = content.replace("[serialize_user(u) for u in users]", "[await serialize_user(u, db) for u in users]")

with open(server_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Endpoints refactored successfully.")
