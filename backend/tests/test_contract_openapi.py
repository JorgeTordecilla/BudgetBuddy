import uuid
from pathlib import Path

import yaml
from fastapi.testclient import TestClient

from app.main import app

SPEC = yaml.safe_load(Path("openapi.yaml").read_text(encoding="utf-8"))
COMPONENTS = SPEC.get("components", {}).get("schemas", {})
VENDOR = "application/vnd.budgetbuddy.v1+json"
PROBLEM = "application/problem+json"


def _resolve_schema(schema: dict) -> dict:
    if "$ref" in schema:
        ref = schema["$ref"].split("/")[-1]
        return COMPONENTS[ref]
    return schema


def _validate_required(schema: dict, payload):
    schema = _resolve_schema(schema)
    if not isinstance(schema, dict):
        return
    if schema.get("type") == "object" and isinstance(payload, dict):
        for key in schema.get("required", []):
            assert key in payload
        for key, child in schema.get("properties", {}).items():
            if key in payload and isinstance(child, dict):
                _validate_required(child, payload[key])
    if schema.get("type") == "array" and isinstance(payload, list) and payload:
        _validate_required(schema.get("items", {}), payload[0])


def _assert_contract(response, path: str, method: str):
    op = SPEC["paths"][path][method.lower()]
    allowed = {int(code) for code in op["responses"].keys()}
    assert response.status_code in allowed

    if response.status_code == 204:
        assert response.text == ""
        return

    content = op["responses"][str(response.status_code)].get("content", {})
    expected_types = list(content.keys())
    assert expected_types
    assert any(response.headers["content-type"].startswith(mt) for mt in expected_types)

    schema = content[expected_types[0]].get("schema")
    if schema:
        _validate_required(schema, response.json())


def test_openapi_route_coverage():
    spec_routes = {
        (method.upper(), f"/api{path}")
        for path, path_item in SPEC["paths"].items()
        for method in path_item.keys()
        if method.lower() in {"get", "post", "patch", "delete"}
    }
    app_routes = {(method.upper(), route.path) for route in app.routes for method in route.methods}
    missing = [route for route in spec_routes if route not in app_routes]
    assert not missing


def test_openapi_e2e_contract_flow():
    with TestClient(app) as client:
        username = f"u_{uuid.uuid4().hex[:8]}"

        register = client.post(
            "/api/auth/register",
            json={"username": username, "password": "supersecurepwd123", "currency_code": "USD"},
            headers={"accept": VENDOR, "content-type": VENDOR},
        )
        _assert_contract(register, "/auth/register", "post")
        access = register.json()["access_token"]
        refresh_token = register.json()["refresh_token"]

        login = client.post(
            "/api/auth/login",
            json={"username": username, "password": "supersecurepwd123"},
            headers={"accept": VENDOR, "content-type": VENDOR},
        )
        _assert_contract(login, "/auth/login", "post")

        refresh = client.post(
            "/api/auth/refresh",
            json={"refresh_token": refresh_token},
            headers={"accept": VENDOR, "content-type": VENDOR},
        )
        _assert_contract(refresh, "/auth/refresh", "post")
        access = refresh.json()["access_token"]
        refresh_token = refresh.json()["refresh_token"]

        headers = {"accept": VENDOR, "content-type": VENDOR, "authorization": f"Bearer {access}"}

        list_accounts = client.get("/api/accounts", headers={"accept": VENDOR, "authorization": f"Bearer {access}"})
        _assert_contract(list_accounts, "/accounts", "get")

        create_account = client.post(
            "/api/accounts",
            json={"name": "wallet", "type": "cash", "initial_balance_cents": 5000, "note": "main"},
            headers=headers,
        )
        _assert_contract(create_account, "/accounts", "post")
        account_id = create_account.json()["id"]

        get_account = client.get(f"/api/accounts/{account_id}", headers={"accept": VENDOR, "authorization": f"Bearer {access}"})
        _assert_contract(get_account, "/accounts/{account_id}", "get")

        patch_account = client.patch(
            f"/api/accounts/{account_id}",
            json={"note": "updated"},
            headers=headers,
        )
        _assert_contract(patch_account, "/accounts/{account_id}", "patch")

        list_categories = client.get("/api/categories", headers={"accept": VENDOR, "authorization": f"Bearer {access}"})
        _assert_contract(list_categories, "/categories", "get")

        create_category = client.post(
            "/api/categories",
            json={"name": "salary", "type": "income", "note": "monthly"},
            headers=headers,
        )
        _assert_contract(create_category, "/categories", "post")
        category_id = create_category.json()["id"]

        get_category = client.get(f"/api/categories/{category_id}", headers={"accept": VENDOR, "authorization": f"Bearer {access}"})
        _assert_contract(get_category, "/categories/{category_id}", "get")

        patch_category = client.patch(
            f"/api/categories/{category_id}",
            json={"note": "updated"},
            headers=headers,
        )
        _assert_contract(patch_category, "/categories/{category_id}", "patch")

        list_tx = client.get("/api/transactions", headers={"accept": VENDOR, "authorization": f"Bearer {access}"})
        _assert_contract(list_tx, "/transactions", "get")

        create_tx = client.post(
            "/api/transactions",
            json={
                "type": "income",
                "account_id": account_id,
                "category_id": category_id,
                "amount_cents": 200000,
                "date": "2026-01-01",
                "merchant": "Acme",
                "note": "salary",
            },
            headers=headers,
        )
        _assert_contract(create_tx, "/transactions", "post")
        transaction_id = create_tx.json()["id"]

        get_tx = client.get(f"/api/transactions/{transaction_id}", headers={"accept": VENDOR, "authorization": f"Bearer {access}"})
        _assert_contract(get_tx, "/transactions/{transaction_id}", "get")

        patch_tx = client.patch(
            f"/api/transactions/{transaction_id}",
            json={"note": "updated"},
            headers=headers,
        )
        _assert_contract(patch_tx, "/transactions/{transaction_id}", "patch")

        by_month = client.get(
            "/api/analytics/by-month?from=2026-01-01&to=2026-12-31",
            headers={"accept": VENDOR, "authorization": f"Bearer {access}"},
        )
        _assert_contract(by_month, "/analytics/by-month", "get")

        by_category = client.get(
            "/api/analytics/by-category?from=2026-01-01&to=2026-12-31",
            headers={"accept": VENDOR, "authorization": f"Bearer {access}"},
        )
        _assert_contract(by_category, "/analytics/by-category", "get")

        delete_tx = client.delete(f"/api/transactions/{transaction_id}", headers={"accept": VENDOR, "authorization": f"Bearer {access}"})
        _assert_contract(delete_tx, "/transactions/{transaction_id}", "delete")

        delete_category = client.delete(f"/api/categories/{category_id}", headers={"accept": VENDOR, "authorization": f"Bearer {access}"})
        _assert_contract(delete_category, "/categories/{category_id}", "delete")

        delete_account = client.delete(f"/api/accounts/{account_id}", headers={"accept": VENDOR, "authorization": f"Bearer {access}"})
        _assert_contract(delete_account, "/accounts/{account_id}", "delete")

        logout = client.post(
            "/api/auth/logout",
            json={"refresh_token": refresh_token},
            headers={"accept": VENDOR, "content-type": VENDOR, "authorization": f"Bearer {access}"},
        )
        _assert_contract(logout, "/auth/logout", "post")

        unauthorized = client.get("/api/accounts", headers={"accept": VENDOR})
        _assert_contract(unauthorized, "/accounts", "get")
        assert unauthorized.headers["content-type"].startswith(PROBLEM)
