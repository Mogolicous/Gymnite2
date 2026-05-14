"""GymNite backend API tests - auth, receipts, admin flows."""
import os
import io
import time
import pytest
import requests
from PIL import Image

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://neon-members-1.preview.emergentagent.com").rstrip("/")
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
    payload = {"name": "TEST User", "email": email, "password": "secret1"}
    r = s.post(f"{API}/auth/register", json=payload, timeout=20)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["role"] == "user"
    assert data["status"] == "no_subscribed"
    assert data["email"] == email
    s.email = email
    s.password = "secret1"
    s.user_id = data["id"]
    return s


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["role"] == "admin"
    return s


# ---------------- Health ----------------
def test_root_health():
    r = requests.get(f"{API}/", timeout=15)
    assert r.status_code == 200
    j = r.json()
    assert j.get("status") == "ok"


# ---------------- Auth ----------------
def test_register_sets_cookies_and_defaults(user_session):
    # cookies must be set on the session
    cookie_names = {c.name for c in user_session.cookies}
    assert "access_token" in cookie_names
    assert "refresh_token" in cookie_names


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


def test_login_valid_and_me(user_session):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": user_session.email, "password": user_session.password}, timeout=15)
    assert r.status_code == 200
    r2 = s.get(f"{API}/auth/me", timeout=15)
    assert r2.status_code == 200
    assert r2.json()["email"] == user_session.email


def test_logout_clears_cookies():
    # register a throwaway
    s = requests.Session()
    ts = int(time.time() * 1000)
    email = f"TEST_logout_{ts}@example.com"
    s.post(f"{API}/auth/register", json={"name": "TEST L", "email": email, "password": "secret1"}, timeout=15)
    r = s.post(f"{API}/auth/logout", timeout=15)
    assert r.status_code == 200
    # cookies should now be cleared on server side; subsequent /me should 401 without cookies
    s2 = requests.Session()
    r2 = s2.get(f"{API}/auth/me", timeout=15)
    assert r2.status_code == 401


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
    # verify persisted
    r2 = user_session.get(f"{API}/auth/me", timeout=15)
    assert r2.json()["status"] == "pending"


def test_receipt_upload_requires_auth():
    files = {"file": ("ticket.jpg", _jpg_bytes(), "image/jpeg")}
    r = requests.post(f"{API}/receipts/upload", files=files, timeout=15)
    assert r.status_code == 401


# ---------------- Admin ----------------
def test_admin_users_forbidden_for_normal_user(user_session):
    r = user_session.get(f"{API}/admin/users", timeout=15)
    assert r.status_code == 403


def test_admin_users_list(admin_session, user_session):
    r = admin_session.get(f"{API}/admin/users", timeout=15)
    assert r.status_code == 200
    users = r.json()
    assert isinstance(users, list)
    # No admin should appear
    assert all(u.get("role") != "admin" for u in users)
    # Our test user must be present and has_receipt should reflect upload state
    me = next((u for u in users if u["id"] == user_session.user_id), None)
    assert me is not None, "test user missing from admin list"
    # By this point in the test order, the user uploaded a receipt -> has_receipt must be True
    assert me["has_receipt"] is True, (
        "BUG: /api/admin/users returns has_receipt=False even though receipt was uploaded. "
        "Root cause: list_users() projection excludes 'receipt_image', so serialize_user "
        "evaluates bool(None) -> False for every user."
    )


def test_admin_get_receipt_returns_image(admin_session, user_session):
    r = admin_session.get(f"{API}/admin/users/{user_session.user_id}/receipt", timeout=15)
    assert r.status_code == 200
    j = r.json()
    assert j["email"] == user_session.email
    assert j["image"].startswith("data:image/jpeg;base64,")


def test_admin_get_receipt_404_when_missing(admin_session):
    # create user without receipt
    s = requests.Session()
    ts = int(time.time() * 1000)
    email = f"TEST_noreceipt_{ts}@example.com"
    rr = s.post(f"{API}/auth/register", json={"name": "TEST NR", "email": email, "password": "secret1"}, timeout=15)
    uid = rr.json()["id"]
    r = admin_session.get(f"{API}/admin/users/{uid}/receipt", timeout=15)
    assert r.status_code == 404


def test_admin_approve_sets_subscribed(admin_session, user_session):
    r = admin_session.post(f"{API}/admin/users/{user_session.user_id}/approve", timeout=15)
    assert r.status_code == 200
    j = r.json()
    assert j["status"] == "subscribed"
    # verify via me
    r2 = user_session.get(f"{API}/auth/me", timeout=15)
    assert r2.json()["status"] == "subscribed"


def test_admin_reject_resets_status(admin_session, user_session):
    # upload again then reject
    files = {"file": ("ticket2.jpg", _jpg_bytes(), "image/jpeg")}
    user_session.post(f"{API}/receipts/upload", files=files, timeout=20)
    r = admin_session.post(f"{API}/admin/users/{user_session.user_id}/reject", timeout=15)
    assert r.status_code == 200
    j = r.json()
    assert j["status"] == "no_subscribed"
    assert j["has_receipt"] is False


def test_admin_approve_forbidden_for_user(user_session):
    r = user_session.post(f"{API}/admin/users/{user_session.user_id}/approve", timeout=15)
    assert r.status_code == 403


def test_admin_stats(admin_session):
    r = admin_session.get(f"{API}/admin/stats", timeout=15)
    assert r.status_code == 200
    j = r.json()
    for k in ("no_subscribed", "pending", "subscribed"):
        assert k in j and isinstance(j[k], int)
