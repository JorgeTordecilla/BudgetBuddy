import uuid
from datetime import timedelta

from fastapi.testclient import TestClient

from app.main import app
from app.core.security import hash_refresh_token
from app.db import SessionLocal
from app.dependencies import utcnow
from app.models import RefreshToken

VENDOR = "application/vnd.budgetbuddy.v1+json"
PROBLEM = "application/problem+json"
MISMATCH_TYPE = "https://api.budgetbuddy.dev/problems/category-type-mismatch"
MISMATCH_TITLE = "Category type mismatch"
UNAUTHORIZED_TYPE = "https://api.budgetbuddy.dev/problems/unauthorized"
UNAUTHORIZED_TITLE = "Unauthorized"
FORBIDDEN_TYPE = "https://api.budgetbuddy.dev/problems/forbidden"
FORBIDDEN_TITLE = "Forbidden"
NOT_ACCEPTABLE_TYPE = "https://api.budgetbuddy.dev/problems/not-acceptable"
NOT_ACCEPTABLE_TITLE = "Not Acceptable"
CATEGORY_ARCHIVED_TYPE = "https://api.budgetbuddy.dev/problems/category-archived"
CATEGORY_ARCHIVED_TITLE = "Category is archived"
INVALID_CURSOR_TYPE = "https://api.budgetbuddy.dev/problems/invalid-cursor"
INVALID_CURSOR_TITLE = "Invalid cursor"
REFRESH_REVOKED_TYPE = "https://api.budgetbuddy.dev/problems/refresh-revoked"
REFRESH_REVOKED_TITLE = "Refresh token revoked"
REFRESH_REUSE_DETECTED_TITLE = "Refresh token reuse detected"


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


def _create_transaction(
    client: TestClient,
    headers: dict[str, str],
    *,
    type_: str,
    account_id: str,
    category_id: str,
    note: str,
    date: str = "2026-02-01",
) -> tuple[int, dict]:
    response = client.post(
        "/api/transactions",
        json={
            "type": type_,
            "account_id": account_id,
            "category_id": category_id,
            "amount_cents": 7000,
            "date": date,
            "merchant": "Acme",
            "note": note,
        },
        headers=headers,
    )
    return response.status_code, response.json()


def _assert_category_mismatch_problem(response):
    assert response.status_code == 409
    assert response.headers["content-type"].startswith(PROBLEM)
    body = response.json()
    assert body["type"] == MISMATCH_TYPE
    assert body["title"] == MISMATCH_TITLE
    assert body["status"] == 409


def _assert_invalid_cursor_problem(response):
    assert response.status_code == 400
    assert response.headers["content-type"].startswith(PROBLEM)
    body = response.json()
    assert body["type"] == INVALID_CURSOR_TYPE
    assert body["title"] == INVALID_CURSOR_TITLE
    assert body["status"] == 400


def _assert_forbidden_problem(response):
    assert response.status_code == 403
    assert response.headers["content-type"].startswith(PROBLEM)
    body = response.json()
    assert body["type"] == FORBIDDEN_TYPE
    assert body["title"] == FORBIDDEN_TITLE
    assert body["status"] == 403


def _assert_refresh_revoked_problem(response, title: str):
    assert response.status_code == 403
    assert response.headers["content-type"].startswith(PROBLEM)
    body = response.json()
    assert body["type"] == REFRESH_REVOKED_TYPE
    assert body["title"] == title
    assert body["status"] == 403


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


def test_refresh_token_rotation_blocks_reuse():
    with TestClient(app) as client:
        user = _register_user(client)

        first_refresh = client.post(
            "/api/auth/refresh",
            json={"refresh_token": user["refresh"]},
            headers={"accept": VENDOR, "content-type": VENDOR},
        )
        assert first_refresh.status_code == 200
        assert first_refresh.headers["content-type"].startswith(VENDOR)
        new_refresh_token = first_refresh.json()["refresh_token"]
        assert new_refresh_token != user["refresh"]

        second_refresh_same_token = client.post(
            "/api/auth/refresh",
            json={"refresh_token": user["refresh"]},
            headers={"accept": VENDOR, "content-type": VENDOR},
        )
        _assert_refresh_revoked_problem(second_refresh_same_token, REFRESH_REUSE_DETECTED_TITLE)


def test_refresh_with_expired_token_returns_401():
    with TestClient(app) as client:
        user = _register_user(client)
        refresh_hash = hash_refresh_token(user["refresh"])

        db = SessionLocal()
        try:
            row = db.query(RefreshToken).filter(RefreshToken.token_hash == refresh_hash).one()
            row.expires_at = utcnow() - timedelta(minutes=1)
            db.commit()
        finally:
            db.close()

        refresh = client.post(
            "/api/auth/refresh",
            json={"refresh_token": user["refresh"]},
            headers={"accept": VENDOR, "content-type": VENDOR},
        )
        assert refresh.status_code == 401
        assert refresh.headers["content-type"].startswith(PROBLEM)
        body = refresh.json()
        assert body["type"] == UNAUTHORIZED_TYPE
        assert body["title"] == UNAUTHORIZED_TITLE
        assert body["status"] == 401


def test_logout_revokes_active_refresh_tokens():
    with TestClient(app) as client:
        user = _register_user(client)

        logout = client.post(
            "/api/auth/logout",
            json={"refresh_token": user["refresh"]},
            headers={
                "accept": VENDOR,
                "content-type": VENDOR,
                "authorization": f"Bearer {user['access']}",
            },
        )
        assert logout.status_code == 204

        refresh_after_logout = client.post(
            "/api/auth/refresh",
            json={"refresh_token": user["refresh"]},
            headers={"accept": VENDOR, "content-type": VENDOR},
        )
        _assert_refresh_revoked_problem(refresh_after_logout, REFRESH_REVOKED_TITLE)


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


def test_create_transaction_fails_when_category_is_archived():
    with TestClient(app) as client:
        user = _register_user(client)
        auth_headers = _auth_headers(user["access"])
        account_id = _create_account(client, auth_headers, "acct-category-archived")
        category_id = _create_category(client, auth_headers, "archived-income-create", "income")

        archive = client.delete(
            f"/api/categories/{category_id}",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        assert archive.status_code == 204

        response = client.post(
            "/api/transactions",
            json={
                "type": "income",
                "account_id": account_id,
                "category_id": category_id,
                "amount_cents": 10000,
                "date": "2026-02-10",
                "merchant": "Acme",
                "note": "archived-category-create",
            },
            headers=auth_headers,
        )
        assert response.status_code == 409
        assert response.headers["content-type"].startswith(PROBLEM)
        body = response.json()
        assert body["type"] == CATEGORY_ARCHIVED_TYPE
        assert body["title"] == CATEGORY_ARCHIVED_TITLE
        assert body["status"] == 409


def test_create_transaction_fails_when_category_type_mismatch():
    with TestClient(app) as client:
        user = _register_user(client)
        auth_headers = _auth_headers(user["access"])
        account_id = _create_account(client, auth_headers, "for-mismatch")
        income_category_id = _create_category(client, auth_headers, "income-mismatch-dir", "income")
        expense_category_id = _create_category(client, auth_headers, "expense-mismatch-dir", "expense")

        for tx_type, category_id in [
            ("income", expense_category_id),  # income->expense mismatch
            ("expense", income_category_id),  # expense->income mismatch
        ]:
            response = client.post(
                "/api/transactions",
                json={
                    "type": tx_type,
                    "account_id": account_id,
                    "category_id": category_id,
                    "amount_cents": 7000,
                    "date": "2026-02-01",
                    "merchant": "Acme",
                    "note": f"mismatch-{tx_type}",
                },
                headers=auth_headers,
            )
            _assert_category_mismatch_problem(response)


def test_patch_transaction_fails_when_category_type_mismatch():
    with TestClient(app) as client:
        user = _register_user(client)
        auth_headers = _auth_headers(user["access"])
        account_id = _create_account(client, auth_headers, "for-patch-mismatch")
        income_category_id = _create_category(client, auth_headers, "income-patch-mismatch", "income")
        expense_category_id = _create_category(client, auth_headers, "expense-patch-mismatch", "expense")

        for initial_type, initial_category, mismatch_category in [
            ("income", income_category_id, expense_category_id),  # income->expense mismatch
            ("expense", expense_category_id, income_category_id),  # expense->income mismatch
        ]:
            status, created_body = _create_transaction(
                client,
                auth_headers,
                type_=initial_type,
                account_id=account_id,
                category_id=initial_category,
                note=f"valid-{initial_type}",
                date="2026-02-02",
            )
            assert status == 201
            transaction_id = created_body["id"]

            # Non-mismatch patch remains valid.
            valid_patch = client.patch(
                f"/api/transactions/{transaction_id}",
                json={"note": "still-valid"},
                headers=auth_headers,
            )
            assert valid_patch.status_code == 200
            assert valid_patch.headers["content-type"].startswith(VENDOR)

            # Mismatch patch by changing category_id must fail.
            mismatch_patch = client.patch(
                f"/api/transactions/{transaction_id}",
                json={"category_id": mismatch_category},
                headers=auth_headers,
            )
            _assert_category_mismatch_problem(mismatch_patch)


def test_patch_transaction_fails_when_category_is_archived():
    with TestClient(app) as client:
        user = _register_user(client)
        auth_headers = _auth_headers(user["access"])
        account_id = _create_account(client, auth_headers, "acct-category-archived-patch")

        active_category_id = _create_category(client, auth_headers, "active-income", "income")
        archived_category_id = _create_category(client, auth_headers, "archived-income-patch", "income")

        status, created = _create_transaction(
            client,
            auth_headers,
            type_="income",
            account_id=account_id,
            category_id=active_category_id,
            note="seed-tx",
            date="2026-02-11",
        )
        assert status == 201
        tx_id = created["id"]

        archive = client.delete(
            f"/api/categories/{archived_category_id}",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        assert archive.status_code == 204

        change_to_archived = client.patch(
            f"/api/transactions/{tx_id}",
            json={"category_id": archived_category_id},
            headers=auth_headers,
        )
        assert change_to_archived.status_code == 409
        assert change_to_archived.headers["content-type"].startswith(PROBLEM)
        body = change_to_archived.json()
        assert body["type"] == CATEGORY_ARCHIVED_TYPE
        assert body["title"] == CATEGORY_ARCHIVED_TITLE
        assert body["status"] == 409

        # Keep existing category while it became archived.
        status2, created2 = _create_transaction(
            client,
            auth_headers,
            type_="income",
            account_id=account_id,
            category_id=active_category_id,
            note="seed-tx-2",
            date="2026-02-12",
        )
        assert status2 == 201
        tx_id_2 = created2["id"]

        archive_active = client.delete(
            f"/api/categories/{active_category_id}",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        assert archive_active.status_code == 204

        keep_archived = client.patch(
            f"/api/transactions/{tx_id_2}",
            json={"note": "should-fail"},
            headers=auth_headers,
        )
        assert keep_archived.status_code == 409
        assert keep_archived.headers["content-type"].startswith(PROBLEM)
        body2 = keep_archived.json()
        assert body2["type"] == CATEGORY_ARCHIVED_TYPE
        assert body2["title"] == CATEGORY_ARCHIVED_TITLE
        assert body2["status"] == 409


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


def test_list_accounts_invalid_cursor_returns_problem_details():
    with TestClient(app) as client:
        user = _register_user(client)
        response = client.get(
            "/api/accounts?cursor=not-base64!!",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        _assert_invalid_cursor_problem(response)


def test_list_categories_invalid_cursor_returns_problem_details():
    with TestClient(app) as client:
        user = _register_user(client)
        response = client.get(
            "/api/categories?cursor=not-base64!!",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        _assert_invalid_cursor_problem(response)


def test_list_transactions_invalid_cursor_returns_problem_details():
    with TestClient(app) as client:
        user = _register_user(client)
        response = client.get(
            "/api/transactions?cursor=not-base64!!",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        _assert_invalid_cursor_problem(response)


def test_restore_category_happy_path_and_idempotent():
    with TestClient(app) as client:
        user = _register_user(client)
        auth_headers = _auth_headers(user["access"])
        category_id = _create_category(client, auth_headers, "restore-me", "expense")

        archive = client.delete(
            f"/api/categories/{category_id}",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        assert archive.status_code == 204

        restore = client.patch(
            f"/api/categories/{category_id}",
            json={"archived_at": None},
            headers=auth_headers,
        )
        assert restore.status_code == 200
        assert restore.headers["content-type"].startswith(VENDOR)
        assert restore.json()["archived_at"] is None

        # Idempotent restore for already-active category.
        restore_again = client.patch(
            f"/api/categories/{category_id}",
            json={"archived_at": None},
            headers=auth_headers,
        )
        assert restore_again.status_code == 200
        assert restore_again.headers["content-type"].startswith(VENDOR)
        assert restore_again.json()["archived_at"] is None


def test_restore_category_requires_auth():
    with TestClient(app) as client:
        user = _register_user(client)
        auth_headers = _auth_headers(user["access"])
        category_id = _create_category(client, auth_headers, "restore-auth", "income")

        response = client.patch(
            f"/api/categories/{category_id}",
            json={"archived_at": None},
            headers={"accept": VENDOR, "content-type": VENDOR},
        )
        assert response.status_code == 401
        assert response.headers["content-type"].startswith(PROBLEM)
        body = response.json()
        assert body["type"] == UNAUTHORIZED_TYPE
        assert body["title"] == UNAUTHORIZED_TITLE
        assert body["status"] == 401


def test_restore_category_forbidden_for_non_owner():
    with TestClient(app) as client:
        owner = _register_user(client)
        other = _register_user(client)
        owner_headers = _auth_headers(owner["access"])
        other_headers = _auth_headers(other["access"])
        category_id = _create_category(client, owner_headers, "restore-foreign", "expense")

        response = client.patch(
            f"/api/categories/{category_id}",
            json={"archived_at": None},
            headers=other_headers,
        )
        _assert_forbidden_problem(response)


def test_accounts_non_owner_matrix_is_forbidden():
    with TestClient(app) as client:
        owner = _register_user(client)
        other = _register_user(client)
        owner_headers = _auth_headers(owner["access"])
        other_headers = _auth_headers(other["access"])
        account_id = _create_account(client, owner_headers, "owner-account-only")

        get_resp = client.get(
            f"/api/accounts/{account_id}",
            headers={"accept": VENDOR, "authorization": f"Bearer {other['access']}"},
        )
        _assert_forbidden_problem(get_resp)

        patch_resp = client.patch(
            f"/api/accounts/{account_id}",
            json={"note": "forbidden"},
            headers=other_headers,
        )
        _assert_forbidden_problem(patch_resp)

        delete_resp = client.delete(
            f"/api/accounts/{account_id}",
            headers={"accept": VENDOR, "authorization": f"Bearer {other['access']}"},
        )
        _assert_forbidden_problem(delete_resp)


def test_categories_non_owner_matrix_is_forbidden():
    with TestClient(app) as client:
        owner = _register_user(client)
        other = _register_user(client)
        owner_headers = _auth_headers(owner["access"])
        other_headers = _auth_headers(other["access"])
        category_id = _create_category(client, owner_headers, "owner-category-only", "expense")

        get_resp = client.get(
            f"/api/categories/{category_id}",
            headers={"accept": VENDOR, "authorization": f"Bearer {other['access']}"},
        )
        _assert_forbidden_problem(get_resp)

        patch_resp = client.patch(
            f"/api/categories/{category_id}",
            json={"note": "forbidden"},
            headers=other_headers,
        )
        _assert_forbidden_problem(patch_resp)

        delete_resp = client.delete(
            f"/api/categories/{category_id}",
            headers={"accept": VENDOR, "authorization": f"Bearer {other['access']}"},
        )
        _assert_forbidden_problem(delete_resp)


def test_transactions_non_owner_matrix_is_forbidden():
    with TestClient(app) as client:
        owner = _register_user(client)
        other = _register_user(client)
        owner_headers = _auth_headers(owner["access"])
        other_headers = _auth_headers(other["access"])
        owner_account_id = _create_account(client, owner_headers, "owner-tx-account")
        owner_category_id = _create_category(client, owner_headers, "owner-tx-category", "income")
        status, created = _create_transaction(
            client,
            owner_headers,
            type_="income",
            account_id=owner_account_id,
            category_id=owner_category_id,
            note="owner-only-tx",
            date="2026-02-15",
        )
        assert status == 201
        tx_id = created["id"]

        get_resp = client.get(
            f"/api/transactions/{tx_id}",
            headers={"accept": VENDOR, "authorization": f"Bearer {other['access']}"},
        )
        _assert_forbidden_problem(get_resp)

        patch_resp = client.patch(
            f"/api/transactions/{tx_id}",
            json={"note": "forbidden"},
            headers=other_headers,
        )
        _assert_forbidden_problem(patch_resp)

        delete_resp = client.delete(
            f"/api/transactions/{tx_id}",
            headers={"accept": VENDOR, "authorization": f"Bearer {other['access']}"},
        )
        _assert_forbidden_problem(delete_resp)


def test_restore_transaction_happy_path_and_idempotent():
    with TestClient(app) as client:
        user = _register_user(client)
        auth_headers = _auth_headers(user["access"])
        account_id = _create_account(client, auth_headers, "restore-tx-account")
        category_id = _create_category(client, auth_headers, "restore-tx-category", "income")
        status, created = _create_transaction(
            client,
            auth_headers,
            type_="income",
            account_id=account_id,
            category_id=category_id,
            note="restore-tx-seed",
            date="2026-02-16",
        )
        assert status == 201
        tx_id = created["id"]

        archive = client.delete(
            f"/api/transactions/{tx_id}",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        assert archive.status_code == 204

        restore = client.patch(
            f"/api/transactions/{tx_id}",
            json={"archived_at": None},
            headers=auth_headers,
        )
        assert restore.status_code == 200
        assert restore.headers["content-type"].startswith(VENDOR)
        assert restore.json()["archived_at"] is None

        restore_again = client.patch(
            f"/api/transactions/{tx_id}",
            json={"archived_at": None},
            headers=auth_headers,
        )
        assert restore_again.status_code == 200
        assert restore_again.headers["content-type"].startswith(VENDOR)
        assert restore_again.json()["archived_at"] is None


def test_restore_transaction_forbidden_for_non_owner():
    with TestClient(app) as client:
        owner = _register_user(client)
        other = _register_user(client)
        owner_headers = _auth_headers(owner["access"])
        other_headers = _auth_headers(other["access"])

        account_id = _create_account(client, owner_headers, "restore-tx-foreign-account")
        category_id = _create_category(client, owner_headers, "restore-tx-foreign-category", "income")
        status, created = _create_transaction(
            client,
            owner_headers,
            type_="income",
            account_id=account_id,
            category_id=category_id,
            note="restore-tx-foreign-seed",
            date="2026-02-17",
        )
        assert status == 201
        tx_id = created["id"]

        response = client.patch(
            f"/api/transactions/{tx_id}",
            json={"archived_at": None},
            headers=other_headers,
        )
        _assert_forbidden_problem(response)


def test_restore_transaction_rejects_unsupported_accept():
    with TestClient(app) as client:
        user = _register_user(client)
        auth_headers = _auth_headers(user["access"])
        account_id = _create_account(client, auth_headers, "restore-tx-accept-account")
        category_id = _create_category(client, auth_headers, "restore-tx-accept-category", "income")
        status, created = _create_transaction(
            client,
            auth_headers,
            type_="income",
            account_id=account_id,
            category_id=category_id,
            note="restore-tx-accept-seed",
            date="2026-02-18",
        )
        assert status == 201
        tx_id = created["id"]

        response = client.patch(
            f"/api/transactions/{tx_id}",
            json={"archived_at": None},
            headers={
                "accept": "application/xml",
                "content-type": VENDOR,
                "authorization": f"Bearer {user['access']}",
            },
        )
        assert response.status_code == 406
        assert response.headers["content-type"].startswith(PROBLEM)
        body = response.json()
        assert body["type"] == NOT_ACCEPTABLE_TYPE
        assert body["title"] == NOT_ACCEPTABLE_TITLE
        assert body["status"] == 406


def test_restore_category_rejects_unsupported_accept():
    with TestClient(app) as client:
        user = _register_user(client)
        auth_headers = _auth_headers(user["access"])
        category_id = _create_category(client, auth_headers, "restore-accept", "income")

        response = client.patch(
            f"/api/categories/{category_id}",
            json={"archived_at": None},
            headers={
                "accept": "application/xml",
                "content-type": VENDOR,
                "authorization": f"Bearer {user['access']}",
            },
        )
        assert response.status_code == 406
        assert response.headers["content-type"].startswith(PROBLEM)
        body = response.json()
        assert body["type"] == NOT_ACCEPTABLE_TYPE
        assert body["title"] == NOT_ACCEPTABLE_TITLE
        assert body["status"] == 406
