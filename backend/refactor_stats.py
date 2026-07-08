import os
import re

server_path = os.path.join(os.path.dirname(__file__), 'server.py')

with open(server_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_stats = """async def admin_stats(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result_no_sub = await db.execute(select(func.count(User.id)).where(User.role == "user", User.status == "no_subscribed"))
    no_sub = result_no_sub.scalar_one()
    
    result_pending = await db.execute(select(func.count(User.id)).where(User.role == "user", User.status == "pending"))
    pending = result_pending.scalar_one()
    
    result_subscribed = await db.execute(select(func.count(User.id)).where(User.role == "user", User.status == "subscribed"))
    subscribed = result_subscribed.scalar_one()
    
    return {"no_subscribed": no_sub, "pending": pending, "subscribed": subscribed}"""

new_stats = """async def admin_stats(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.role == "user"))
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
            
    return {"no_subscribed": no_sub, "pending": pending, "subscribed": subscribed}"""
content = content.replace(old_stats, new_stats)

old_reports = """async def admin_reports(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result_total = await db.execute(select(func.count(User.id)).where(User.role == "user"))
    total_users = result_total.scalar_one()

    result_active_users = await db.execute(select(User).where(User.role == "user", User.status == "subscribed"))
    active_users_list = result_active_users.scalars().all()
    
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
        ptype = u.plan_type or "pesas"
        pmonths = u.plan_months or 1
        price = plan_prices.get(ptype, plan_prices["pesas"]).get(pmonths, 25)
        monthly_value = price / pmonths
        mrr += monthly_value
        if ptype in revenue_by_plan:
            revenue_by_plan[ptype] += monthly_value
            
        if u.plan_expires_at:
            try:
                # Handle ISO format potentially ending in Z
                exp_date_str = u.plan_expires_at.replace("Z", "+00:00")
                exp_date = datetime.fromisoformat(exp_date_str)
                if exp_date.tzinfo is None:
                    exp_date = exp_date.replace(tzinfo=timezone.utc)
                if now <= exp_date <= next_30:
                    expiring_soon += 1
            except Exception:
                pass

    thirty_days_ago = (now - timedelta(days=30)).strftime("%Y-%m-%d")
    result_att = await db.execute(select(Attendance.date, func.count(Attendance.id)).where(Attendance.date >= thirty_days_ago).group_by(Attendance.date).order_by(Attendance.date.asc()))
    attendance_data = result_att.all()
    trend_dict = {row[0]: row[1] for row in attendance_data}
    
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
    }"""
new_reports = """async def admin_reports(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result_total = await db.execute(select(User).where(User.role == "user"))
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
    }"""
content = content.replace(old_reports, new_reports)

with open(server_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Stats and Reports refactored.")
