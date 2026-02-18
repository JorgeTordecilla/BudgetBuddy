import uuid

from fastapi.testclient import TestClient

from app.main import app

VENDOR = "application/vnd.budgetbuddy.v1+json"
PROBLEM = "application/problem+json"


def _register_user(client: TestClient):
    username = f"u_{uuid.uuid4().hex[:8]}"
    payload = {
        "username": username,
        "password": "supersecurepwd123",
        "currency_code": "USD",
    }
    r = client.post("/api/auth/register", json=payload, headers={"accept": VENDOR, "content-type": VENDOR})
    assert r.status_code == 201
    assert r.headers["content-type"].startswith(VENDOR)
    body = r.json()
    return {
        "username": username,
        "password": payload["password"],
        "access": body["access_token"],
        "refresh": body["refresh_token"],
    }


def test_problem_details_on_invalid_accept():
    with TestClient(app) as client:
        r = client.post(
            "/api/auth/register",
            json={"username": "abc_123", "password": "supersecurepwd123", "currency_code": "USD"},
            headers={"accept": "application/xml", "content-type": VENDOR},
        )
        assert r.status_code == 406
        assert r.headers["content-type"].startswith(PROBLEM)
        body = r.json()
        assert body["status"] == 406
        assert body["title"] == "Not Acceptable"


def test_auth_lifecycle_and_204_logout():
    with TestClient(app) as client:
        user = _register_user(client)

        login = client.post(
            "/api/auth/login",
            json={"username": user["username"], "password": user["password"]},
            headers={"accept": VENDOR, "content-type": VENDOR},
        )
        assert login.status_code == 200
        assert login.headers["content-type"].startswith(VENDOR)

        bad_login = client.post(
            "/api/auth/login",
            json={"username": user["username"], "password": "wrongpassword123"},
            headers={"accept": VENDOR, "content-type": VENDOR},
        )
        assert bad_login.status_code == 401
        assert bad_login.headers["content-type"].startswith(PROBLEM)

        refresh = client.post(
            "/api/auth/refresh",
            json={"refresh_token": user["refresh"]},
            headers={"accept": VENDOR, "content-type": VENDOR},
        )
        assert refresh.status_code == 200

        logout = client.post(
            "/api/auth/logout",
            json={"refresh_token": refresh.json()["refresh_token"]},
            headers={
                "accept": VENDOR,
                "content-type": VENDOR,
                "authorization": f"Bearer {refresh.json()['access_token']}",
            },
        )
        assert logout.status_code == 204
        assert logout.text == ""


def test_domain_and_analytics_flow():
    with TestClient(app) as client:
        user = _register_user(client)
        auth_headers = {
            "accept": VENDOR,
            "content-type": VENDOR,
            "authorization": f"Bearer {user['access']}",
        }

        unauth = client.get("/api/accounts", headers={"accept": VENDOR})
        assert unauth.status_code == 401

        acc = client.post(
            "/api/accounts",
            json={"name": "wallet", "type": "cash", "initial_balance_cents": 10000, "note": "main"},
            headers=auth_headers,
        )
        assert acc.status_code == 201
        account_id = acc.json()["id"]

        cat = client.post(
            "/api/categories",
            json={"name": "salary", "type": "income", "note": "monthly"},
            headers=auth_headers,
        )
        assert cat.status_code == 201
        category_id = cat.json()["id"]

        tx = client.post(
            "/api/transactions",
            json={
                "type": "income",
                "account_id": account_id,
                "category_id": category_id,
                "amount_cents": 500000,
                "date": "2026-01-15",
                "merchant": "Acme",
                "note": "salary",
            },
            headers=auth_headers,
        )
        assert tx.status_code == 201

        by_month = client.get("/api/analytics/by-month?from=2026-01-01&to=2026-12-31", headers=auth_headers)
        assert by_month.status_code == 200
        assert by_month.headers["content-type"].startswith(VENDOR)
        assert isinstance(by_month.json()["items"], list)

        by_category = client.get("/api/analytics/by-category?from=2026-01-01&to=2026-12-31", headers=auth_headers)
        assert by_category.status_code == 200
        assert by_category.headers["content-type"].startswith(VENDOR)

        forbidden = client.get(f"/api/accounts/{uuid.uuid4()}", headers=auth_headers)
        assert forbidden.status_code == 403
        assert forbidden.headers["content-type"].startswith(PROBLEM)
