import pytest
from fastapi.testclient import TestClient
from server import app, engine, Base
from sqlalchemy import text

client = TestClient(app)

def test_functional_flow():
    # 1. Register a new user
    print("Test: Registrando usuario de prueba...")
    res = client.post("/api/auth/register", json={
        "name": "Usuario Test",
        "email": "test@gymnite.com",
        "password": "password123"
    })
    assert res.status_code == 200, f"Error registro: {res.text}"
    user_data = res.json()
    assert user_data["email"] == "test@gymnite.com"
    assert user_data["role"] == "user"
    print("Registro exitoso.")
    
    # 2. Login
    print("Test: Iniciando sesión...")
    res_login = client.post("/api/auth/login", json={
        "email": "test@gymnite.com",
        "password": "password123"
    })
    assert res_login.status_code == 200, f"Error login: {res_login.text}"
    token = res_login.cookies.get("access_token")
    assert token is not None
    print("Login exitoso.")
    
    # 3. Check /me
    print("Test: Obteniendo perfil...")
    res_me = client.get("/api/auth/me", cookies={"access_token": token})
    assert res_me.status_code == 200
    assert res_me.json()["email"] == "test@gymnite.com"
    print("Perfil obtenido exitosamente. Flujo básico superado.")

if __name__ == "__main__":
    test_functional_flow()
