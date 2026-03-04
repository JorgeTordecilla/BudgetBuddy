import uuid
from http.cookies import SimpleCookie
from pathlib import Path

import yaml
from fastapi.testclient import TestClient

from app.main import app

SPEC = yaml.safe_load(Path("openapi.yaml").read_text(encoding="utf-8"))
COMPONENTS = SPEC.get("components", {}).get("schemas", {})
VENDOR = "application/vnd.budgetbuddy.v1+json"
PROBLEM = "application/problem+json"
REFRESH_COOKIE_NAME = "bb_refresh"
BUDGET_MONTH_INVALID_TYPE = "https://api.budgetbuddy.dev/problems/budget-month-invalid"
BUDGET_MONTH_INVALID_TITLE = "Budget month format is invalid"
RATE_LIMITED_TYPE = "https://api.budgetbuddy.dev/problems/rate-limited"
RATE_LIMITED_TITLE = "Too Many Requests"
SERVICE_UNAVAILABLE_TYPE = "https://api.budgetbuddy.dev/problems/service-unavailable"
SERVICE_UNAVAILABLE_TITLE = "Service Unavailable"
ORIGIN_NOT_ALLOWED_TYPE = "https://api.budgetbuddy.dev/problems/origin-not-allowed"
ORIGIN_NOT_ALLOWED_TITLE = "Forbidden"
TRANSACTION_MOOD_INVALID_TYPE = "https://api.budgetbuddy.dev/problems/transaction-mood-invalid"
TRANSACTION_MOOD_INVALID_TITLE = "Transaction mood value is invalid"
BILL_CATEGORY_TYPE_MISMATCH_TYPE = "https://api.budgetbuddy.dev/problems/bill-category-type-mismatch"
BILL_CATEGORY_TYPE_MISMATCH_TITLE = "Bill category must be of type expense"
BILL_DUE_DAY_INVALID_TYPE = "https://api.budgetbuddy.dev/problems/bill-due-day-invalid"
BILL_DUE_DAY_INVALID_TITLE = "Bill due day must be between 1 and 28"
BILL_ALREADY_PAID_TYPE = "https://api.budgetbuddy.dev/problems/bill-already-paid"
BILL_ALREADY_PAID_TITLE = "Bill already paid for this month"
BILL_INACTIVE_FOR_MONTH_TYPE = "https://api.budgetbuddy.dev/problems/bill-inactive-for-month"
BILL_INACTIVE_FOR_MONTH_TITLE = "Bill is inactive for this month"
SAVINGS_GOAL_INVALID_TARGET_TYPE = "https://api.budgetbuddy.dev/problems/savings-goal-invalid-target"
SAVINGS_GOAL_INVALID_TARGET_TITLE = "Savings goal target must be greater than zero"
SAVINGS_GOAL_CATEGORY_TYPE_MISMATCH_TYPE = "https://api.budgetbuddy.dev/problems/savings-goal-category-type-mismatch"
SAVINGS_GOAL_CATEGORY_TYPE_MISMATCH_TITLE = "Savings goal category must be of type expense"
SAVINGS_GOAL_DEADLINE_PAST_TYPE = "https://api.budgetbuddy.dev/problems/savings-goal-deadline-past"
SAVINGS_GOAL_DEADLINE_PAST_TITLE = "Savings goal deadline cannot be in the past"
SAVINGS_GOAL_NOT_ACTIVE_TYPE = "https://api.budgetbuddy.dev/problems/savings-goal-not-active"
SAVINGS_GOAL_NOT_ACTIVE_TITLE = "Savings goal is not active and cannot receive contributions"
SAVINGS_CONTRIBUTION_INVALID_AMOUNT_TYPE = "https://api.budgetbuddy.dev/problems/savings-contribution-invalid-amount"
SAVINGS_CONTRIBUTION_INVALID_AMOUNT_TITLE = "Contribution amount must be greater than zero"
SAVINGS_GOAL_ALREADY_COMPLETED_TYPE = "https://api.budgetbuddy.dev/problems/savings-goal-already-completed"
SAVINGS_GOAL_ALREADY_COMPLETED_TITLE = "Savings goal is already completed"
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


def _refresh_headers(refresh_token: str) -> dict[str, str]:
    return {
        "accept": VENDOR,
        "content-type": VENDOR,
        "cookie": f"{REFRESH_COOKIE_NAME}={refresh_token}",
    }


def _refresh_cookie_from_response(response) -> str:
    cookie = SimpleCookie()
    cookie.load(response.headers.get("set-cookie", ""))
    morsel = cookie.get(REFRESH_COOKIE_NAME)
    assert morsel is not None
    return morsel.value


def _auth_flow(client: TestClient, username: str) -> tuple[str, str]:
    register = client.post(
        "/api/auth/register",
        json={"username": username, "password": "supersecurepwd123", "currency_code": "USD"},
        headers={"accept": VENDOR, "content-type": VENDOR},
    )
    _assert_contract(register, "/auth/register", "post")
    register_refresh_cookie = _refresh_cookie_from_response(register)

    login = client.post(
        "/api/auth/login",
        json={"username": username, "password": "supersecurepwd123"},
        headers={"accept": VENDOR, "content-type": VENDOR},
    )
    _assert_contract(login, "/auth/login", "post")

    refresh = client.post(
        "/api/auth/refresh",
        headers=_refresh_headers(register_refresh_cookie),
    )
    _assert_contract(refresh, "/auth/refresh", "post")
    return refresh.json()["access_token"], _refresh_cookie_from_response(refresh)


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


def _income_source_flow(client: TestClient, access: str) -> str:
    headers = _auth_headers(access)
    listed = client.get("/api/income-sources", headers={"accept": VENDOR, "authorization": f"Bearer {access}"})
    _assert_contract(listed, "/income-sources", "get")

    created = client.post(
        "/api/income-sources",
        json={"name": "Paycheck 1", "expected_amount_cents": 250000, "frequency": "monthly", "is_active": True, "note": "salary"},
        headers=headers,
    )
    _assert_contract(created, "/income-sources", "post")
    income_source_id = created.json()["id"]

    fetched = client.get(
        f"/api/income-sources/{income_source_id}",
        headers={"accept": VENDOR, "authorization": f"Bearer {access}"},
    )
    _assert_contract(fetched, "/income-sources/{income_source_id}", "get")

    patched = client.patch(
        f"/api/income-sources/{income_source_id}",
        json={"note": "updated"},
        headers=headers,
    )
    _assert_contract(patched, "/income-sources/{income_source_id}", "patch")
    return income_source_id


def _analytics_flow(client: TestClient, access: str, account_id: str, category_id: str) -> None:
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

    income = client.get(
        "/api/analytics/income?from=2026-01-01&to=2026-12-31",
        headers={"accept": VENDOR, "authorization": f"Bearer {access}"},
    )
    _assert_contract(income, "/analytics/income", "get")

    impulse = client.get(
        "/api/analytics/impulse-summary?from=2026-01-01&to=2026-12-31",
        headers={"accept": VENDOR, "authorization": f"Bearer {access}"},
    )
    _assert_contract(impulse, "/analytics/impulse-summary", "get")

    preview = client.get(
        "/api/rollover/preview?month=2026-01",
        headers={"accept": VENDOR, "authorization": f"Bearer {access}"},
    )
    _assert_contract(preview, "/rollover/preview", "get")

    apply = client.post(
        "/api/rollover/apply",
        json={"source_month": "2026-01", "account_id": account_id, "category_id": category_id},
        headers={"accept": VENDOR, "content-type": VENDOR, "authorization": f"Bearer {access}"},
    )
    _assert_contract(apply, "/rollover/apply", "post")


def _me_flow(client: TestClient, access: str) -> None:
    me = client.get("/api/me", headers={"accept": VENDOR, "authorization": f"Bearer {access}"})
    _assert_contract(me, "/me", "get")


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


def _teardown_flow(
    client: TestClient,
    access: str,
    refresh_token: str,
    account_id: str,
    category_id: str,
    transaction_id: str,
    income_source_id: str,
) -> None:
    delete_tx = client.delete(f"/api/transactions/{transaction_id}", headers={"accept": VENDOR, "authorization": f"Bearer {access}"})
    _assert_contract(delete_tx, "/transactions/{transaction_id}", "delete")

    delete_category = client.delete(f"/api/categories/{category_id}", headers={"accept": VENDOR, "authorization": f"Bearer {access}"})
    _assert_contract(delete_category, "/categories/{category_id}", "delete")

    delete_account = client.delete(f"/api/accounts/{account_id}", headers={"accept": VENDOR, "authorization": f"Bearer {access}"})
    _assert_contract(delete_account, "/accounts/{account_id}", "delete")

    delete_income_source = client.delete(
        f"/api/income-sources/{income_source_id}",
        headers={"accept": VENDOR, "authorization": f"Bearer {access}"},
    )
    _assert_contract(delete_income_source, "/income-sources/{income_source_id}", "delete")

    logout = client.post(
        "/api/auth/logout",
        headers=_refresh_headers(refresh_token),
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

    assert "503" in refresh_responses
    assert "application/problem+json" in refresh_responses["503"]["content"]


def test_transactions_rate_limit_contract_mappings_exist():
    import_responses = SPEC["paths"]["/transactions/import"]["post"]["responses"]
    export_responses = SPEC["paths"]["/transactions/export"]["get"]["responses"]

    assert "429" in import_responses
    assert "429" in export_responses
    assert "application/problem+json" in import_responses["429"]["content"]
    assert "application/problem+json" in export_responses["429"]["content"]
    assert "Retry-After" in import_responses["429"].get("headers", {})
    assert "Retry-After" in export_responses["429"].get("headers", {})


def test_auth_cookie_transport_contract_mappings_exist():
    register_post = SPEC["paths"]["/auth/register"]["post"]
    login_post = SPEC["paths"]["/auth/login"]["post"]
    refresh_post = SPEC["paths"]["/auth/refresh"]["post"]
    logout_post = SPEC["paths"]["/auth/logout"]["post"]

    assert "requestBody" in register_post
    assert "requestBody" in login_post
    assert "requestBody" not in refresh_post
    assert "requestBody" not in logout_post

    assert "Set-Cookie" in register_post["responses"]["201"].get("headers", {})
    assert "Set-Cookie" in login_post["responses"]["200"].get("headers", {})
    assert "Set-Cookie" in refresh_post["responses"]["200"].get("headers", {})
    assert "Set-Cookie" in logout_post["responses"]["204"].get("headers", {})
    assert "X-Request-Id" in login_post["responses"]["200"].get("headers", {})
    assert "X-Request-Id" in login_post["responses"]["400"].get("headers", {})
    assert "X-Request-Id" in login_post["responses"]["401"].get("headers", {})
    assert "X-Request-Id" in login_post["responses"]["406"].get("headers", {})
    assert "X-Request-Id" in login_post["responses"]["429"].get("headers", {})
    assert "X-Request-Id" in refresh_post["responses"]["200"].get("headers", {})
    assert "X-Request-Id" in refresh_post["responses"]["400"].get("headers", {})
    assert "X-Request-Id" in refresh_post["responses"]["401"].get("headers", {})
    assert "X-Request-Id" in refresh_post["responses"]["403"].get("headers", {})
    assert "X-Request-Id" in refresh_post["responses"]["503"].get("headers", {})
    assert "X-Request-Id" in refresh_post["responses"]["406"].get("headers", {})
    assert "X-Request-Id" in refresh_post["responses"]["429"].get("headers", {})
    assert "X-Request-Id" in logout_post["responses"]["204"].get("headers", {})
    assert "X-Request-Id" in logout_post["responses"]["400"].get("headers", {})
    assert "X-Request-Id" in logout_post["responses"]["401"].get("headers", {})
    assert "X-Request-Id" in logout_post["responses"]["403"].get("headers", {})
    assert "X-Request-Id" in logout_post["responses"]["406"].get("headers", {})

    register_schema_ref = register_post["responses"]["201"]["content"][VENDOR]["schema"]["$ref"]
    login_schema_ref = login_post["responses"]["200"]["content"][VENDOR]["schema"]["$ref"]
    refresh_schema_ref = refresh_post["responses"]["200"]["content"][VENDOR]["schema"]["$ref"]
    assert register_schema_ref.endswith("/AuthSessionResponse")
    assert login_schema_ref.endswith("/AuthSessionResponse")
    assert refresh_schema_ref.endswith("/AuthSessionResponse")

    auth_session_schema = SPEC["components"]["schemas"]["AuthSessionResponse"]
    assert "refresh_token" not in auth_session_schema.get("properties", {})
    access_token_schema = auth_session_schema["properties"]["access_token"]
    assert "JWT" in access_token_schema.get("description", "")

    refresh_cookie_header_desc = SPEC["components"]["headers"]["Set-Cookie-Refresh"]["description"]
    cleared_cookie_header_desc = SPEC["components"]["headers"]["Set-Cookie-Refresh-Cleared"]["description"]
    assert "Domain" in refresh_cookie_header_desc
    assert "By default" in refresh_cookie_header_desc
    assert "omitted" in refresh_cookie_header_desc
    assert "REFRESH_COOKIE_DOMAIN" in refresh_cookie_header_desc
    assert "Domain" in cleared_cookie_header_desc
    assert "omitted" in cleared_cookie_header_desc

    register_access_token = register_post["responses"]["201"]["content"][VENDOR]["example"]["access_token"]
    assert register_access_token.count(".") == 2
    refresh_forbidden_examples = refresh_post["responses"]["403"]["content"][PROBLEM]["examples"]
    assert "origin-not-allowed" in refresh_forbidden_examples
    assert refresh_forbidden_examples["origin-not-allowed"]["$ref"].endswith("/Problem403OriginNotAllowed")
    refresh_503_examples = refresh_post["responses"]["503"]["content"][PROBLEM]["examples"]
    assert refresh_503_examples["canonical"]["$ref"].endswith("/Problem503ServiceUnavailable")


def test_origin_not_allowed_problem_catalog_mapping_exists():
    catalog = SPEC["components"]["x-problem-details-catalog"]
    origin_not_allowed = [item for item in catalog if item["type"] == ORIGIN_NOT_ALLOWED_TYPE]
    assert len(origin_not_allowed) == 1
    assert origin_not_allowed[0]["title"] == ORIGIN_NOT_ALLOWED_TITLE
    assert origin_not_allowed[0]["status"] == 403


def test_service_unavailable_problem_catalog_mapping_exists():
    catalog = SPEC["components"]["x-problem-details-catalog"]
    service_unavailable = [item for item in catalog if item["type"] == SERVICE_UNAVAILABLE_TYPE]
    assert len(service_unavailable) == 1
    assert service_unavailable[0]["title"] == SERVICE_UNAVAILABLE_TITLE
    assert service_unavailable[0]["status"] == 503


def test_transaction_mood_invalid_problem_catalog_mapping_exists():
    catalog = SPEC["components"]["x-problem-details-catalog"]
    mood_invalid = [item for item in catalog if item["type"] == TRANSACTION_MOOD_INVALID_TYPE]
    assert len(mood_invalid) == 1
    assert mood_invalid[0]["title"] == TRANSACTION_MOOD_INVALID_TITLE
    assert mood_invalid[0]["status"] == 422


def test_cors_cookie_cross_site_contract_notes_exist():
    description = SPEC["info"]["description"]
    assert "BUDGETBUDDY_CORS_ORIGINS" in description
    assert "Access-Control-Allow-Credentials" in description
    assert "GET,POST,PATCH,DELETE,OPTIONS" in description
    assert "X-Request-Id,Retry-After" in description
    assert "X-Content-Type-Options" in description
    assert "Referrer-Policy" in description
    assert "Cross-Origin-Opener-Policy" in description
    assert "Content-Security-Policy" in description


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


def test_openapi_archived_policy_contract_wording_is_explicit():
    for path in ("/accounts", "/categories", "/transactions", "/income-sources"):
        op = SPEC["paths"][path]["get"]
        description = op.get("description", "")
        assert "excluded by default" in description
        assert "include_archived=true" in description

        include_archived_param = next(p for p in op["parameters"] if p["name"] == "include_archived")
        assert include_archived_param["schema"]["default"] is False
        assert "Defaults to false" in include_archived_param.get("description", "")

    for path in ("/accounts/{account_id}", "/categories/{category_id}", "/transactions/{transaction_id}", "/income-sources/{income_source_id}"):
        get_description = SPEC["paths"][path]["get"].get("description", "")
        assert "regardless of archive state" in get_description
        delete_204_description = SPEC["paths"][path]["delete"]["responses"]["204"]["description"]
        assert "Archived (soft-delete)" in delete_204_description

    for path in ("/analytics/by-month", "/analytics/by-category", "/analytics/income", "/analytics/impulse-summary", "/rollover/preview"):
        description = SPEC["paths"][path]["get"].get("description", "")
        assert "archived transactions are excluded" in description


def test_openapi_e2e_contract_flow():
    with TestClient(app) as client:
        username = f"u_{uuid.uuid4().hex[:8]}"
        access, refresh_token = _auth_flow(client, username)
        account_id = _account_flow(client, access)
        category_id = _category_flow(client, access)
        transaction_id = _transaction_flow(client, access, account_id, category_id)
        income_source_id = _income_source_flow(client, access)
        _transaction_import_export_flow(client, access, account_id, category_id)
        _me_flow(client, access)
        list_audit = client.get("/api/audit?limit=20", headers={"accept": VENDOR, "authorization": f"Bearer {access}"})
        _assert_contract(list_audit, "/audit", "get")
        _analytics_flow(client, access, account_id, category_id)
        _budget_invalid_month_flow(client, access)
        _teardown_flow(client, access, refresh_token, account_id, category_id, transaction_id, income_source_id)

        unauthorized = client.get("/api/accounts", headers={"accept": VENDOR})
        _assert_contract(unauthorized, "/accounts", "get")
        assert unauthorized.headers["content-type"].startswith(PROBLEM)


def test_me_contract_mappings_exist():
    me_get = SPEC["paths"]["/me"]["get"]
    responses = me_get["responses"]

    assert "200" in responses
    assert "401" in responses
    assert "406" in responses
    assert "application/vnd.budgetbuddy.v1+json" in responses["200"]["content"]
    assert "application/problem+json" in responses["401"]["content"]
    assert "application/problem+json" in responses["406"]["content"]
    assert "X-Request-Id" in responses["200"].get("headers", {})
    assert "X-Request-Id" in responses["401"].get("headers", {})
    assert "X-Request-Id" in responses["406"].get("headers", {})


def test_bills_openapi_paths_and_schemas_exist():
    paths = SPEC["paths"]
    assert "/bills" in paths
    assert "/bills/monthly-status" in paths
    assert "/bills/{bill_id}" in paths
    assert "/bills/{bill_id}/payments" in paths
    assert "/bills/{bill_id}/payments/{month}" in paths

    schemas = SPEC["components"]["schemas"]
    for schema_name in [
        "BillCreate",
        "BillUpdate",
        "BillOut",
        "BillPaymentCreate",
        "BillPaymentOut",
        "BillMonthlyStatusItem",
        "BillMonthlyStatusOut",
    ]:
        assert schema_name in schemas


def test_bills_problem_catalog_entries_exist():
    catalog = SPEC["components"]["x-problem-details-catalog"]

    expected = {
        BILL_CATEGORY_TYPE_MISMATCH_TYPE: (BILL_CATEGORY_TYPE_MISMATCH_TITLE, 409),
        BILL_DUE_DAY_INVALID_TYPE: (BILL_DUE_DAY_INVALID_TITLE, 422),
        BILL_ALREADY_PAID_TYPE: (BILL_ALREADY_PAID_TITLE, 409),
        BILL_INACTIVE_FOR_MONTH_TYPE: (BILL_INACTIVE_FOR_MONTH_TITLE, 409),
    }
    for problem_type, (title, status) in expected.items():
        matches = [item for item in catalog if item["type"] == problem_type]
        assert len(matches) == 1
        assert matches[0]["title"] == title
        assert matches[0]["status"] == status


def test_bills_error_responses_reference_problem_examples():
    bills_post_409_examples = SPEC["paths"]["/bills"]["post"]["responses"]["409"]["content"][PROBLEM]["examples"]
    assert "bill-category-type-mismatch" in bills_post_409_examples

    bills_post_422_examples = SPEC["paths"]["/bills"]["post"]["responses"]["422"]["content"][PROBLEM]["examples"]
    assert "bill-due-day-invalid" in bills_post_422_examples

    payments_post_409_examples = SPEC["paths"]["/bills/{bill_id}/payments"]["post"]["responses"]["409"]["content"][PROBLEM]["examples"]
    assert "bill-already-paid" in payments_post_409_examples
    assert "bill-inactive-for-month" in payments_post_409_examples


def test_savings_openapi_paths_and_schemas_exist():
    paths = SPEC["paths"]
    assert "/savings-goals" in paths
    assert "/savings-goals/summary" in paths
    assert "/savings-goals/{goal_id}" in paths
    assert "/savings-goals/{goal_id}/complete" in paths
    assert "/savings-goals/{goal_id}/cancel" in paths
    assert "/savings-goals/{goal_id}/contributions" in paths
    assert "/savings-goals/{goal_id}/contributions/{contribution_id}" in paths

    schemas = SPEC["components"]["schemas"]
    for schema_name in [
        "SavingsGoalCreate",
        "SavingsGoalUpdate",
        "SavingsGoalOut",
        "SavingsGoalListOut",
        "SavingsGoalDetailOut",
        "SavingsContributionCreate",
        "SavingsContributionOut",
        "SavingsSummaryOut",
    ]:
        assert schema_name in schemas


def test_savings_problem_catalog_entries_exist():
    catalog = SPEC["components"]["x-problem-details-catalog"]

    expected = {
        SAVINGS_GOAL_INVALID_TARGET_TYPE: (SAVINGS_GOAL_INVALID_TARGET_TITLE, 422),
        SAVINGS_GOAL_CATEGORY_TYPE_MISMATCH_TYPE: (SAVINGS_GOAL_CATEGORY_TYPE_MISMATCH_TITLE, 409),
        SAVINGS_GOAL_DEADLINE_PAST_TYPE: (SAVINGS_GOAL_DEADLINE_PAST_TITLE, 422),
        SAVINGS_GOAL_NOT_ACTIVE_TYPE: (SAVINGS_GOAL_NOT_ACTIVE_TITLE, 409),
        SAVINGS_CONTRIBUTION_INVALID_AMOUNT_TYPE: (SAVINGS_CONTRIBUTION_INVALID_AMOUNT_TITLE, 422),
        SAVINGS_GOAL_ALREADY_COMPLETED_TYPE: (SAVINGS_GOAL_ALREADY_COMPLETED_TITLE, 409),
    }
    for problem_type, (title, status) in expected.items():
        matches = [item for item in catalog if item["type"] == problem_type]
        assert len(matches) == 1
        assert matches[0]["title"] == title
        assert matches[0]["status"] == status


def test_savings_error_responses_reference_problem_examples():
    goals_post_409_examples = SPEC["paths"]["/savings-goals"]["post"]["responses"]["409"]["content"][PROBLEM]["examples"]
    assert "savings-goal-category-type-mismatch" in goals_post_409_examples

    goals_post_422_examples = SPEC["paths"]["/savings-goals"]["post"]["responses"]["422"]["content"][PROBLEM]["examples"]
    assert "savings-goal-invalid-target" in goals_post_422_examples
    assert "savings-goal-deadline-past" in goals_post_422_examples

    complete_409_examples = SPEC["paths"]["/savings-goals/{goal_id}/complete"]["post"]["responses"]["409"]["content"][PROBLEM]["examples"]
    assert "savings-goal-not-active" in complete_409_examples

    cancel_409_examples = SPEC["paths"]["/savings-goals/{goal_id}/cancel"]["post"]["responses"]["409"]["content"][PROBLEM]["examples"]
    assert "savings-goal-already-completed" in cancel_409_examples

    contribution_post_422_examples = SPEC["paths"]["/savings-goals/{goal_id}/contributions"]["post"]["responses"]["422"]["content"][PROBLEM]["examples"]
    assert "savings-contribution-invalid-amount" in contribution_post_422_examples
