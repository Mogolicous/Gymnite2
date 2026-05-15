"""GymNite backend API tests - auth, receipts, admin flows (iteration 2)."""
import os
import io
import time
import pytest
import requests
from PIL import Image

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE}/api"

ADMIN_EMAIL = "admin@gymnite.com"
ADMIN_PASSWORD = "12345"


def _jpg_bytes(size=(120, 120)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", size, color=(80, 40, 160)).save(buf, format="JPEG", quality=85)
    return buf.getvalue()


def _png_bytes(size=(60, 60)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", size, color=(20, 20, 20)).save(buf, format="PNG")
    return buf.getvalue()


@pytest.fixture(scope="module")
def user_session():
    s = requests.Session()
    ts = int(time.time() * 1000)
    email = f"TEST_user_{ts}@example.com".lower()
    r = s.post(f"{API}/auth/register", json={"name": "TEST User", "email": email, "password": "secret1"}, timeout=20)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    data = r.json()
    s.email = email
    s.password = "secret1"
    s.user_id = data["id"]
    return s


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    assert r.json()["role"] == "admin"
    return s


# ---------------- Health ----------------
def test_root_health():
    r = requests.get(f"{API}/", timeout=15)
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


# ---------------- Auth ----------------
def test_register_sets_cookies(user_session):
    names = {c.name for c in user_session.cookies}
    assert "access_token" in names and "refresh_token" in names


def test_me_returns_current_user(user_session):
    r = user_session.get(f"{API}/auth/me", timeout=15)
    assert r.status_code == 200
    j = r.json()
    assert j["email"] == user_session.email
    assert j["role"] == "user"
    assert j["status"] == "no_subscribed"


def test_login_bad_credentials_returns_401():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrongpass"}, timeout=15)
    assert r.status_code == 401


def test_logout_clears_cookies():
    s = requests.Session()
    ts = int(time.time() * 1000)
    s.post(f"{API}/auth/register", json={"name": "TEST L", "email": f"TEST_logout_{ts}@example.com", "password": "secret1"}, timeout=15)
    r = s.post(f"{API}/auth/logout", timeout=15)
    assert r.status_code == 200
    s2 = requests.Session()
    assert s2.get(f"{API}/auth/me", timeout=15).status_code == 401


def test_register_duplicate_email_rejected(user_session):
    r = requests.post(f"{API}/auth/register", json={"name": "Dup", "email": user_session.email, "password": "secret1"}, timeout=15)
    assert r.status_code == 400


# ---------------- Receipts ----------------
def test_receipt_upload_rejects_non_jpg(user_session):
    files = {"file": ("evil.png", _png_bytes(), "image/png")}
    r = user_session.post(f"{API}/receipts/upload", files=files, timeout=20)
    assert r.status_code == 400


def test_receipt_upload_jpg_sets_pending(user_session):
    files = {"file": ("ticket.jpg", _jpg_bytes(), "image/jpeg")}
    r = user_session.post(f"{API}/receipts/upload", files=files, timeout=20)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["status"] == "pending"
    assert j["has_receipt"] is True


def test_receipt_upload_requires_auth():
    files = {"file": ("ticket.jpg", _jpg_bytes(), "image/jpeg")}
    r = requests.post(f"{API}/receipts/upload", files=files, timeout=15)
    assert r.status_code == 401


# ---------------- Admin guard ----------------
def test_admin_users_forbidden_for_normal_user(user_session):
    r = user_session.get(f"{API}/admin/users", timeout=15)
    assert r.status_code == 403


def test_admin_users_unauthenticated_401():
    r = requests.get(f"{API}/admin/users", timeout=15)
    assert r.status_code == 401


# ---------------- Admin list (iteration 2 fields) ----------------
def test_admin_users_list_has_iter2_fields(admin_session, user_session):
    r = admin_session.get(f"{API}/admin/users", timeout=15)
    assert r.status_code == 200
    users = r.json()
    assert all(u.get("role") != "admin" for u in users)
    me = next((u for u in users if u["id"] == user_session.user_id), None)
    assert me is not None
    # iteration 1 fix: has_receipt computed via aggregation
    assert me["has_receipt"] is True
    # iteration 2 fields present on every record
    for k in ("manual", "plan_months", "plan_started_at", "plan_expires_at"):
        assert k in me, f"missing field {k}"
    assert me["manual"] is False  # registered user, not manual


def test_admin_get_receipt_returns_image(admin_session, user_session):
    r = admin_session.get(f"{API}/admin/users/{user_session.user_id}/receipt", timeout=15)
    assert r.status_code == 200
    assert r.json()["image"].startswith("data:image/jpeg;base64,")


# ---------------- Approve with plan_months ----------------
def test_admin_approve_requires_body(admin_session, user_session):
    # No body -> 422 from FastAPI (missing required field)
    r = admin_session.post(f"{API}/admin/users/{user_session.user_id}/approve", timeout=15)
    assert r.status_code in (400, 422)


def test_admin_approve_rejects_invalid_plan_months(admin_session, user_session):
    r = admin_session.post(f"{API}/admin/users/{user_session.user_id}/approve", json={"plan_months": 5}, timeout=15)
    assert r.status_code == 400


def test_admin_approve_valid_plan_sets_subscribed_and_dates(admin_session, user_session):
    r = admin_session.post(f"{API}/admin/users/{user_session.user_id}/approve", json={"plan_months": 6}, timeout=15)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["status"] == "subscribed"
    assert j["plan_months"] == 6
    assert j["plan_started_at"] is not None
    assert j["plan_expires_at"] is not None
    # Persisted
    r2 = user_session.get(f"{API}/auth/me", timeout=15)
    me = r2.json()
    assert me["status"] == "subscribed"
    assert me["plan_months"] == 6


@pytest.mark.parametrize("months", [1, 3, 12])
def test_admin_approve_accepts_all_valid_values(admin_session, user_session, months):
    r = admin_session.post(f"{API}/admin/users/{user_session.user_id}/approve", json={"plan_months": months}, timeout=15)
    assert r.status_code == 200
    assert r.json()["plan_months"] == months


def test_admin_reject_clears_plan_fields(admin_session, user_session):
    # ensure currently subscribed with plan
    admin_session.post(f"{API}/admin/users/{user_session.user_id}/approve", json={"plan_months": 3}, timeout=15)
    r = admin_session.post(f"{API}/admin/users/{user_session.user_id}/reject", timeout=15)
    assert r.status_code == 200
    j = r.json()
    assert j["status"] == "no_subscribed"
    assert j["plan_months"] is None
    assert j["plan_started_at"] is None
    assert j["plan_expires_at"] is None
    assert j["has_receipt"] is False


def test_admin_approve_forbidden_for_user(user_session):
    r = user_session.post(f"{API}/admin/users/{user_session.user_id}/approve", json={"plan_months": 6}, timeout=15)
    assert r.status_code == 403


# ---------------- Manual users (iteration 2) ----------------
def test_create_manual_user_with_email_and_jpg(admin_session):
    ts = int(time.time() * 1000)
    email = f"TEST_manual_{ts}@example.com"
    files = {"file": ("ticket.jpg", _jpg_bytes(), "image/jpeg")}
    data = {"name": "TEST Manual With Receipt", "email": email}
    r = admin_session.post(f"{API}/admin/users/manual", data=data, files=files, timeout=20)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["manual"] is True
    assert j["status"] == "pending"
    assert j["has_receipt"] is True
    assert j["email"] == email.lower()
    # verify in list
    lst = admin_session.get(f"{API}/admin/users", timeout=15).json()
    found = next((u for u in lst if u["id"] == j["id"]), None)
    assert found is not None
    assert found["manual"] is True
    assert found["has_receipt"] is True


def test_create_manual_user_without_file_is_no_subscribed(admin_session):
    ts = int(time.time() * 1000)
    data = {"name": f"TEST Manual NoFile {ts}"}
    r = admin_session.post(f"{API}/admin/users/manual", data=data, timeout=15)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["manual"] is True
    assert j["status"] == "no_subscribed"
    assert j["has_receipt"] is False
    assert j.get("email") in (None, "")


def test_create_two_manual_users_without_email_allowed(admin_session):
    ts = int(time.time() * 1000)
    r1 = admin_session.post(f"{API}/admin/users/manual", data={"name": f"TEST NoEmail A {ts}"}, timeout=15)
    r2 = admin_session.post(f"{API}/admin/users/manual", data={"name": f"TEST NoEmail B {ts}"}, timeout=15)
    assert r1.status_code == 200, r1.text
    assert r2.status_code == 200, r2.text
    assert r1.json()["id"] != r2.json()["id"]


def test_create_manual_user_duplicate_email_rejected(admin_session, user_session):
    r = admin_session.post(
        f"{API}/admin/users/manual",
        data={"name": "TEST Dup", "email": user_session.email},
        timeout=15,
    )
    assert r.status_code == 400


def test_create_manual_user_rejects_non_jpg(admin_session):
    files = {"file": ("evil.png", _png_bytes(), "image/png")}
    r = admin_session.post(
        f"{API}/admin/users/manual",
        data={"name": "TEST PNG"},
        files=files,
        timeout=15,
    )
    assert r.status_code == 400


def test_create_manual_user_rejects_oversize_file(admin_session):
    big = b"\xff\xd8\xff" + b"A" * (5 * 1024 * 1024 + 10)  # JPG magic + > 5MB
    files = {"file": ("huge.jpg", big, "image/jpeg")}
    r = admin_session.post(
        f"{API}/admin/users/manual",
        data={"name": "TEST Big"},
        files=files,
        timeout=30,
    )
    assert r.status_code == 400


def test_create_manual_user_requires_admin(user_session):
    r = user_session.post(f"{API}/admin/users/manual", data={"name": "TEST forbidden"}, timeout=15)
    assert r.status_code == 403


def test_create_manual_user_unauthenticated_401():
    r = requests.post(f"{API}/admin/users/manual", data={"name": "TEST unauth"}, timeout=15)
    assert r.status_code == 401


# ---------------- Stats ----------------
def test_admin_stats(admin_session):
    r = admin_session.get(f"{API}/admin/stats", timeout=15)
    assert r.status_code == 200
    j = r.json()
    for k in ("no_subscribed", "pending", "subscribed"):
        assert k in j and isinstance(j[k], int)
