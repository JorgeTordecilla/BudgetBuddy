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


def test_create_transaction_fails_when_account_is_archived():
    with TestClient(app) as client:
        user = _register_user(client)
        auth_headers = {
            "accept": VENDOR,
            "content-type": VENDOR,
            "authorization": f"Bearer {user['access']}",
        }

        account = client.post(
            "/api/accounts",
            json={"name": "to-archive", "type": "cash", "initial_balance_cents": 1000, "note": "old"},
            headers=auth_headers,
        )
        assert account.status_code == 201
        account_id = account.json()["id"]

        category = client.post(
            "/api/categories",
            json={"name": "bonus", "type": "income", "note": "income"},
            headers=auth_headers,
        )
        assert category.status_code == 201
        category_id = category.json()["id"]

        archive = client.delete(
            f"/api/accounts/{account_id}",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        assert archive.status_code == 204

        create_tx = client.post(
            "/api/transactions",
            json={
                "type": "income",
                "account_id": account_id,
                "category_id": category_id,
                "amount_cents": 120000,
                "date": "2026-01-20",
                "merchant": "Acme",
                "note": "should fail",
            },
            headers=auth_headers,
        )
        assert create_tx.status_code == 409
        assert create_tx.headers["content-type"].startswith(PROBLEM)
        body = create_tx.json()
        assert body["type"] == "https://api.budgetbuddy.dev/problems/account-archived"
        assert body["title"] == "Account is archived"
        assert body["status"] == 409


def test_transaction_validation_error_returns_problem_details():
    with TestClient(app) as client:
        user = _register_user(client)
        auth_headers = {
            "accept": VENDOR,
            "content-type": VENDOR,
            "authorization": f"Bearer {user['access']}",
        }

        invalid_payload = {
            "account_id": str(uuid.uuid4()),
            "category_id": str(uuid.uuid4()),
            "amount_cents": 1200,
            "date": "2026-01-20",
        }
        response = client.post("/api/transactions", json=invalid_payload, headers=auth_headers)
        assert response.status_code == 400
        assert response.headers["content-type"].startswith(PROBLEM)
        body = response.json()
        assert body["status"] == 400
        assert "title" in body
        assert "type" in body


def test_list_transactions_filters_and_ordering():
    with TestClient(app) as client:
        user = _register_user(client)
        auth_headers = {
            "accept": VENDOR,
            "content-type": VENDOR,
            "authorization": f"Bearer {user['access']}",
        }

        account_1 = client.post(
            "/api/accounts",
            json={"name": "wallet-main", "type": "cash", "initial_balance_cents": 10000, "note": "main"},
            headers=auth_headers,
        )
        assert account_1.status_code == 201
        account_1_id = account_1.json()["id"]

        account_2 = client.post(
            "/api/accounts",
            json={"name": "wallet-secondary", "type": "cash", "initial_balance_cents": 10000, "note": "secondary"},
            headers=auth_headers,
        )
        assert account_2.status_code == 201
        account_2_id = account_2.json()["id"]

        income_category = client.post(
            "/api/categories",
            json={"name": "salary-filter", "type": "income", "note": "income"},
            headers=auth_headers,
        )
        assert income_category.status_code == 201
        income_category_id = income_category.json()["id"]

        expense_category = client.post(
            "/api/categories",
            json={"name": "food-filter", "type": "expense", "note": "expense"},
            headers=auth_headers,
        )
        assert expense_category.status_code == 201
        expense_category_id = expense_category.json()["id"]

        tx_1 = client.post(
            "/api/transactions",
            json={
                "type": "income",
                "account_id": account_1_id,
                "category_id": income_category_id,
                "amount_cents": 10000,
                "date": "2026-01-10",
                "merchant": "Acme",
                "note": "tx1",
            },
            headers=auth_headers,
        )
        assert tx_1.status_code == 201

        tx_2 = client.post(
            "/api/transactions",
            json={
                "type": "income",
                "account_id": account_1_id,
                "category_id": income_category_id,
                "amount_cents": 12000,
                "date": "2026-01-12",
                "merchant": "Acme",
                "note": "tx2",
            },
            headers=auth_headers,
        )
        assert tx_2.status_code == 201
        tx_2_id = tx_2.json()["id"]

        tx_3 = client.post(
            "/api/transactions",
            json={
                "type": "expense",
                "account_id": account_1_id,
                "category_id": expense_category_id,
                "amount_cents": 5000,
                "date": "2026-01-11",
                "merchant": "Store",
                "note": "tx3",
            },
            headers=auth_headers,
        )
        assert tx_3.status_code == 201

        tx_4 = client.post(
            "/api/transactions",
            json={
                "type": "income",
                "account_id": account_2_id,
                "category_id": income_category_id,
                "amount_cents": 13000,
                "date": "2026-01-13",
                "merchant": "Acme",
                "note": "tx4",
            },
            headers=auth_headers,
        )
        assert tx_4.status_code == 201

        filtered = client.get(
            "/api/transactions?type=income&account_id="
            f"{account_1_id}&from=2026-01-09&to=2026-01-12",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        assert filtered.status_code == 200
        assert filtered.headers["content-type"].startswith(VENDOR)
        body = filtered.json()
        assert body["next_cursor"] is None
        assert len(body["items"]) == 2
        assert [item["id"] for item in body["items"]] == [tx_2_id, tx_1.json()["id"]]
