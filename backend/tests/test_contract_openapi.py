import uuid
from pathlib import Path

import yaml
from fastapi.testclient import TestClient

from app.main import app

SPEC = yaml.safe_load(Path("openapi.yaml").read_text(encoding="utf-8"))
COMPONENTS = SPEC.get("components", {}).get("schemas", {})
VENDOR = "application/vnd.budgetbuddy.v1+json"
PROBLEM = "application/problem+json"
BUDGET_MONTH_INVALID_TYPE = "https://api.budgetbuddy.dev/problems/budget-month-invalid"
BUDGET_MONTH_INVALID_TITLE = "Budget month format is invalid"
RATE_LIMITED_TYPE = "https://api.budgetbuddy.dev/problems/rate-limited"
RATE_LIMITED_TITLE = "Too Many Requests"
CANONICAL_EXAMPLE_STATUSES = {400, 401, 403, 406, 409, 429}


def _resolve_schema(schema: dict) -> dict:
    if "$ref" in schema:
        ref = schema["$ref"].split("/")[-1]
        return COMPONENTS[ref]
    return schema


def _validate_object_required(schema: dict, payload) -> None:
    if not isinstance(payload, dict):
        return
    for key in schema.get("required", []):
        assert key in payload
    for key, child in schema.get("properties", {}).items():
        if key in payload and isinstance(child, dict):
            _validate_required(child, payload[key])


def _validate_array_required(schema: dict, payload) -> None:
    if isinstance(payload, list) and payload:
        _validate_required(schema.get("items", {}), payload[0])


def _validate_required(schema: dict, payload) -> None:
    schema = _resolve_schema(schema)
    if not isinstance(schema, dict):
        return

    schema_type = schema.get("type")
    if schema_type == "object":
        _validate_object_required(schema, payload)
        return
    if schema_type == "array":
        _validate_array_required(schema, payload)


def _assert_contract(response, path: str, method: str) -> None:
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
    if schema and response.headers["content-type"].startswith("application/"):
        _validate_required(schema, response.json())


def _auth_headers(access: str) -> dict[str, str]:
    return {"accept": VENDOR, "content-type": VENDOR, "authorization": f"Bearer {access}"}


def _auth_flow(client: TestClient, username: str) -> tuple[str, str]:
    register = client.post(
        "/api/auth/register",
        json={"username": username, "password": "supersecurepwd123", "currency_code": "USD"},
        headers={"accept": VENDOR, "content-type": VENDOR},
    )
    _assert_contract(register, "/auth/register", "post")

    login = client.post(
        "/api/auth/login",
        json={"username": username, "password": "supersecurepwd123"},
        headers={"accept": VENDOR, "content-type": VENDOR},
    )
    _assert_contract(login, "/auth/login", "post")

    refresh = client.post(
        "/api/auth/refresh",
        json={"refresh_token": register.json()["refresh_token"]},
        headers={"accept": VENDOR, "content-type": VENDOR},
    )
    _assert_contract(refresh, "/auth/refresh", "post")
    return refresh.json()["access_token"], refresh.json()["refresh_token"]


def _account_flow(client: TestClient, access: str) -> str:
    headers = _auth_headers(access)
    list_accounts = client.get("/api/accounts", headers={"accept": VENDOR, "authorization": f"Bearer {access}"})
    _assert_contract(list_accounts, "/accounts", "get")

    created = client.post(
        "/api/accounts",
        json={"name": "wallet", "type": "cash", "initial_balance_cents": 5000, "note": "main"},
        headers=headers,
    )
    _assert_contract(created, "/accounts", "post")
    account_id = created.json()["id"]

    fetched = client.get(f"/api/accounts/{account_id}", headers={"accept": VENDOR, "authorization": f"Bearer {access}"})
    _assert_contract(fetched, "/accounts/{account_id}", "get")

    patched = client.patch(f"/api/accounts/{account_id}", json={"note": "updated"}, headers=headers)
    _assert_contract(patched, "/accounts/{account_id}", "patch")
    return account_id


def _category_flow(client: TestClient, access: str) -> str:
    headers = _auth_headers(access)
    listed = client.get("/api/categories", headers={"accept": VENDOR, "authorization": f"Bearer {access}"})
    _assert_contract(listed, "/categories", "get")

    created = client.post(
        "/api/categories",
        json={"name": "salary", "type": "income", "note": "monthly"},
        headers=headers,
    )
    _assert_contract(created, "/categories", "post")
    category_id = created.json()["id"]

    fetched = client.get(
        f"/api/categories/{category_id}",
        headers={"accept": VENDOR, "authorization": f"Bearer {access}"},
    )
    _assert_contract(fetched, "/categories/{category_id}", "get")

    patched = client.patch(f"/api/categories/{category_id}", json={"note": "updated"}, headers=headers)
    _assert_contract(patched, "/categories/{category_id}", "patch")
    return category_id


def _transaction_flow(client: TestClient, access: str, account_id: str, category_id: str) -> str:
    headers = _auth_headers(access)
    listed = client.get("/api/transactions", headers={"accept": VENDOR, "authorization": f"Bearer {access}"})
    _assert_contract(listed, "/transactions", "get")

    created = client.post(
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
    _assert_contract(created, "/transactions", "post")
    tx_id = created.json()["id"]

    fetched = client.get(f"/api/transactions/{tx_id}", headers={"accept": VENDOR, "authorization": f"Bearer {access}"})
    _assert_contract(fetched, "/transactions/{transaction_id}", "get")

    patched = client.patch(f"/api/transactions/{tx_id}", json={"note": "updated"}, headers=headers)
    _assert_contract(patched, "/transactions/{transaction_id}", "patch")
    return tx_id


def _analytics_flow(client: TestClient, access: str) -> None:
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


def _transaction_import_export_flow(client: TestClient, access: str, account_id: str, category_id: str) -> None:
    imported = client.post(
        "/api/transactions/import",
        json={
            "mode": "partial",
            "items": [
                {
                    "type": "income",
                    "account_id": account_id,
                    "category_id": category_id,
                    "amount_cents": 300000,
                    "date": "2026-02-02",
                    "merchant": "Acme",
                    "note": "imported",
                }
            ],
        },
        headers={"accept": VENDOR, "content-type": VENDOR, "authorization": f"Bearer {access}"},
    )
    _assert_contract(imported, "/transactions/import", "post")

    exported = client.get(
        "/api/transactions/export?from=2026-01-01&to=2026-12-31",
        headers={"accept": "text/csv", "authorization": f"Bearer {access}"},
    )
    _assert_contract(exported, "/transactions/export", "get")


def _budget_invalid_month_flow(client: TestClient, access: str) -> None:
    response = client.get(
        "/api/budgets?from=2026-13&to=2026-12",
        headers={"accept": VENDOR, "authorization": f"Bearer {access}"},
    )
    _assert_contract(response, "/budgets", "get")
    assert response.headers["content-type"].startswith(PROBLEM)
    body = response.json()
    assert body["type"] == BUDGET_MONTH_INVALID_TYPE
    assert body["title"] == BUDGET_MONTH_INVALID_TITLE
    assert body["status"] == 400


def _teardown_flow(client: TestClient, access: str, refresh_token: str, account_id: str, category_id: str, transaction_id: str) -> None:
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


def test_auth_rate_limit_contract_mappings_exist():
    login_responses = SPEC["paths"]["/auth/login"]["post"]["responses"]
    refresh_responses = SPEC["paths"]["/auth/refresh"]["post"]["responses"]

    assert "429" in login_responses
    assert "429" in refresh_responses
    assert "application/problem+json" in login_responses["429"]["content"]
    assert "application/problem+json" in refresh_responses["429"]["content"]
    assert "Retry-After" in login_responses["429"].get("headers", {})
    assert "Retry-After" in refresh_responses["429"].get("headers", {})

    catalog = SPEC["components"]["x-problem-details-catalog"]
    rate_limited = [item for item in catalog if item["type"] == RATE_LIMITED_TYPE]
    assert len(rate_limited) == 1
    assert rate_limited[0]["title"] == RATE_LIMITED_TITLE
    assert rate_limited[0]["status"] == 429


def test_audit_contract_mappings_exist():
    audit_get = SPEC["paths"]["/audit"]["get"]
    responses = audit_get["responses"]

    assert "200" in responses
    assert "400" in responses
    assert "401" in responses
    assert "403" in responses
    assert "406" in responses
    assert "application/vnd.budgetbuddy.v1+json" in responses["200"]["content"]
    assert "application/problem+json" in responses["400"]["content"]
    assert "application/problem+json" in responses["401"]["content"]
    assert "application/problem+json" in responses["403"]["content"]
    assert "application/problem+json" in responses["406"]["content"]

    schemas = SPEC["components"]["schemas"]
    assert "AuditEvent" in schemas
    assert "AuditListResponse" in schemas


def test_openapi_examples_coverage_and_canonical_problem_examples():
    schemas = SPEC["components"]["schemas"]
    problem_schema = schemas["ProblemDetails"]
    example_statuses = {item.get("status") for item in problem_schema.get("examples", []) if isinstance(item, dict)}
    assert CANONICAL_EXAMPLE_STATUSES.issubset(example_statuses)

    for path, path_item in SPEC["paths"].items():
        for method, operation in path_item.items():
            if method.lower() not in {"get", "post", "patch", "delete"}:
                continue

            responses = operation.get("responses", {})
            success_has_body = False
            success_has_example = False
            error_has_problem = False
            error_has_example = False

            for status_code, response in responses.items():
                status_s = str(status_code)
                content = response.get("content", {})

                if status_s.startswith("2"):
                    media = content.get(VENDOR) or content.get("text/csv")
                    if isinstance(media, dict):
                        success_has_body = True
                        if "example" in media or "examples" in media:
                            success_has_example = True
                        else:
                            schema = media.get("schema", {})
                            if isinstance(schema, dict) and "$ref" in schema:
                                schema_name = schema["$ref"].split("/")[-1]
                                schema_obj = schemas.get(schema_name, {})
                                success_has_example = success_has_example or "example" in schema_obj or "examples" in schema_obj

                if status_s.startswith(("4", "5")) and PROBLEM in content:
                    error_has_problem = True
                    media = content[PROBLEM]
                    if "example" in media or "examples" in media:
                        error_has_example = True
                    else:
                        error_has_example = error_has_example or "examples" in problem_schema or "example" in problem_schema

            if success_has_body:
                assert success_has_example, f"Missing success example in {method.upper()} {path}"
            if error_has_problem:
                assert error_has_example, f"Missing error example in {method.upper()} {path}"


def test_openapi_e2e_contract_flow():
    with TestClient(app) as client:
        username = f"u_{uuid.uuid4().hex[:8]}"
        access, refresh_token = _auth_flow(client, username)
        account_id = _account_flow(client, access)
        category_id = _category_flow(client, access)
        transaction_id = _transaction_flow(client, access, account_id, category_id)
        _transaction_import_export_flow(client, access, account_id, category_id)
        list_audit = client.get("/api/audit?limit=20", headers={"accept": VENDOR, "authorization": f"Bearer {access}"})
        _assert_contract(list_audit, "/audit", "get")
        _analytics_flow(client, access)
        _budget_invalid_month_flow(client, access)
        _teardown_flow(client, access, refresh_token, account_id, category_id, transaction_id)

        unauthorized = client.get("/api/accounts", headers={"accept": VENDOR})
        _assert_contract(unauthorized, "/accounts", "get")
        assert unauthorized.headers["content-type"].startswith(PROBLEM)
