from fastapi.testclient import TestClient
import uuid

from app.main import app

VENDOR = "application/vnd.budgetbuddy.v1+json"


def _register_user(client: TestClient):
    payload = {
        "username": f"mr_{uuid.uuid4().hex[:8]}",
        "password": "StrongPwd123!",
        "currency_code": "USD",
    }
    r = client.post("/api/auth/register", json=payload, headers={"accept": VENDOR, "content-type": VENDOR})
    assert r.status_code == 201
    return {"access": r.json()["access_token"]}


def _auth_headers(access: str) -> dict[str, str]:
    return {
        "accept": VENDOR,
        "content-type": VENDOR,
        "authorization": f"Bearer {access}",
    }


def _create_account(client: TestClient, headers: dict[str, str], name: str) -> str:
    response = client.post(
        "/api/accounts",
        json={"name": name, "type": "cash", "initial_balance_cents": 1000, "note": "acct"},
        headers=headers,
    )
    assert response.status_code == 201
    return response.json()["id"]


def _create_category(client: TestClient, headers: dict[str, str], name: str, type_: str) -> str:
    response = client.post(
        "/api/categories",
        json={"name": name, "type": type_, "note": type_},
        headers=headers,
    )
    assert response.status_code == 201
    return response.json()["id"]


def test_transactions_crud_contract_regression_after_modular_split():
    with TestClient(app) as client:
        user = _register_user(client)
        headers = _auth_headers(user["access"])
        account_id = _create_account(client, headers, "Modular CRUD Account")
        category_id = _create_category(client, headers, "Modular CRUD Category", "expense")

        created = client.post(
            "/api/transactions",
            json={
                "type": "expense",
                "account_id": account_id,
                "category_id": category_id,
                "amount_cents": 2500,
                "date": "2026-03-10",
                "merchant": "Coffee",
                "note": "regression",
            },
            headers=headers,
        )
        assert created.status_code == 201
        assert created.headers["content-type"].startswith(VENDOR)
        tx_id = created.json()["id"]

        listed = client.get("/api/transactions?limit=20", headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"})
        assert listed.status_code == 200
        assert listed.headers["content-type"].startswith(VENDOR)
        assert any(item["id"] == tx_id for item in listed.json()["items"])

        patched = client.patch(
            f"/api/transactions/{tx_id}",
            json={"note": "updated"},
            headers=headers,
        )
        assert patched.status_code == 200
        assert patched.headers["content-type"].startswith(VENDOR)
        assert patched.json()["note"] == "updated"

        fetched = client.get(f"/api/transactions/{tx_id}", headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"})
        assert fetched.status_code == 200
        assert fetched.headers["content-type"].startswith(VENDOR)
        assert fetched.json()["id"] == tx_id

        deleted = client.delete(f"/api/transactions/{tx_id}", headers=headers)
        assert deleted.status_code == 204


def test_transactions_import_export_contract_regression_after_modular_split():
    with TestClient(app) as client:
        user = _register_user(client)
        headers = _auth_headers(user["access"])
        account_id = _create_account(client, headers, "Modular Import Account")
        category_id = _create_category(client, headers, "Modular Import Category", "expense")

        imported = client.post(
            "/api/transactions/import",
            json={
                "mode": "partial",
                "items": [
                    {
                            "type": "expense",
                            "account_id": account_id,
                            "category_id": category_id,
                            "amount_cents": 1000,
                            "date": "2026-03-01",
                            "merchant": "Store",
                            "note": "imported-row",
                    }
                ],
            },
            headers=headers,
        )
        assert imported.status_code == 200
        assert imported.headers["content-type"].startswith(VENDOR)
        body = imported.json()
        assert body["created_count"] == 1
        assert body["failed_count"] == 0

        exported = client.get(
            "/api/transactions/export?from=2026-03-01&to=2026-03-31&type=expense",
            headers={"accept": "text/csv", "authorization": f"Bearer {user['access']}"},
        )
        assert exported.status_code == 200
        assert exported.headers["content-type"].startswith("text/csv")
        assert "date,type,account,category,amount_cents,merchant,note,mood,is_impulse" in exported.text.splitlines()[0]
