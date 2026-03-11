## 1. Runtime Hardening

- [x] 1.1 Change `POST /auth/refresh` throttling identity in `backend/app/routers/auth.py` from `token_hash + ip` to client IP only.
- [x] 1.2 Add `auth_register_rate_limit_per_minute` to `backend/app/core/config.py` with env var `AUTH_REGISTER_RATE_LIMIT_PER_MINUTE` and default `5`.
- [x] 1.3 Include the new register throttling setting in `safe_log_fields`.
- [x] 1.4 Extend `_auth_rate_limit_or_429` in `backend/app/routers/auth.py` to support `endpoint="register"`.
- [x] 1.5 Update `POST /auth/register` to receive `Request` and apply IP-based throttling before database work.
- [x] 1.6 Document `AUTH_REGISTER_RATE_LIMIT_PER_MINUTE` in `backend/.env.example`.
- [x] 1.7 Add passive bucket cleanup to `InMemoryRateLimiter` in `backend/app/core/rate_limit.py` using a periodic sweep under the existing lock.

## 2. Contract And Spec Alignment

- [x] 2.1 Update `backend/openapi.yaml` so `POST /auth/register` documents canonical `429` ProblemDetails.
- [x] 2.2 Update `backend/openapi.yaml` so `POST /auth/register` documents the `Retry-After` response header.
- [x] 2.3 Update `openspec/specs/openapi.yaml` to mirror the `POST /auth/register` throttling contract if this change is keeping the mirror in sync.
- [x] 2.4 Add a delta spec for `auth-rate-limiting` covering register throttling, refresh IP-only identity, and bounded in-memory limiter behavior.
- [x] 2.5 Add a delta spec for `auth-session-management` covering throttled register behavior and refresh non-bypass semantics.
- [x] 2.6 Add a delta spec for `api-http-contract` covering `429`, `Retry-After`, and additive register throttling contract behavior.
- [x] 2.7 Add a delta spec for `runtime-configuration` covering the new register throttling env var.
- [x] 2.8 Add a delta spec for `in-memory-rate-limiter-hygiene` covering passive eviction of expired inactive buckets.

## 3. Test Coverage

- [x] 3.1 Add an integration test proving `POST /auth/register` returns canonical `429` after the configured threshold from the same IP.
- [x] 3.2 Add an integration test proving throttled register responses include `Retry-After`.
- [x] 3.3 Add an integration test proving `POST /auth/refresh` throttling cannot be bypassed by sending different invalid refresh token values from the same IP.
- [x] 3.4 Add an integration test proving refresh requests from distinct client identities do not share the same bucket when trusted-proxy rules do not collapse them.
- [x] 3.5 Add unit tests for `InMemoryRateLimiter` passive cleanup, including eviction of expired unlocked buckets and retention of still-locked buckets.
- [x] 3.6 Confirm existing login and refresh under-threshold behavior remains unchanged.

## 4. Verification

- [x] 4.1 Run targeted backend integration tests from virtualenv:
  `cd backend && source .venv/bin/activate && python -m pytest tests/test_api_integration.py -k "register or refresh or rate_limit"`
- [x] 4.2 Run targeted backend unit tests for limiter behavior from virtualenv:
  `cd backend && source .venv/bin/activate && python -m pytest tests/test_core_units.py -k "rate_limit"`
- [x] 4.3 Run full backend regression suite from virtualenv:
  `cd backend && source .venv/bin/activate && python -m pytest`
- [x] 4.4 Record the default register limit, refresh identity strategy, and cleanup sweep cadence in verification notes.

## Verification Notes

- Default register limit implemented: `AUTH_REGISTER_RATE_LIMIT_PER_MINUTE=5`.
- Refresh throttling identity now uses trusted client IP resolution only.
- In-memory limiter passive cleanup sweep cadence: every `1000` `check()` calls.
- Verified contract coverage:
  `cd backend && .venv/bin/python -m pytest tests/test_contract_openapi.py -q -k "auth_rate_limit_contract_mappings_exist or auth_cookie_transport_contract_mappings_exist"`
  -> `2 passed`
- Verified limiter/config unit coverage:
  `cd backend && .venv/bin/python -m pytest tests/test_core_units.py -q -k "in_memory_rate_limiter_passive_cleanup or settings"`
  -> `19 passed`
- Verified full backend regression suite:
  `cd backend && python -m pytest -q`
  -> `204 passed in 194.79s`
