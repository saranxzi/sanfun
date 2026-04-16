from fastapi.testclient import TestClient
from app.main import app
import sys

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    assert response.json() == {"status": "ok"}
    print("Health check OK!")

def test_auth():
    username = "test_derpy_user"
    password = "supersecurepassword123"

    # Register
    res = client.post("/api/auth/register", json={"username": username, "password": password})
    assert res.status_code == 200, f"Register failed: {res.text}"
    print("Register OK!")

    # Login
    res = client.post("/api/auth/login", data={"username": username, "password": password})
    assert res.status_code == 200, f"Login failed: {res.text}"
    data = res.json()
    assert "access_token" in data
    print("Login OK!")

if __name__ == "__main__":
    try:
        test_health()
        test_auth()
        print("ALL TESTS PASSED")
        sys.exit(0)
    except Exception as e:
        print(f"TEST FAILED: {e}")
        sys.exit(1)
