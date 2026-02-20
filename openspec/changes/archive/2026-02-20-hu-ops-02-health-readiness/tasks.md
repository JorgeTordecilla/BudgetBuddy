## 1. Contract

- [x] 1.1 Add OpenAPI paths for `GET /healthz` and `GET /readyz`.
- [x] 1.2 Define response schemas including `status` and `version` (and `checks` for readiness).
- [x] 1.3 Ensure probe endpoint docs include `X-Request-Id` response header behavior.

## 2. Runtime behavior

- [x] 2.1 Implement `GET /healthz` as process-liveness only (no DB access).
- [x] 2.2 Implement `GET /readyz` with DB connectivity check.
- [x] 2.3 Return `503` from `readyz` when required readiness checks fail.
- [x] 2.4 Keep response payloads deterministic and minimal for infra probes.

## 3. Tests

- [x] 3.1 Add integration tests for `healthz` success and `X-Request-Id`.
- [x] 3.2 Add integration tests for `readyz` success path.
- [x] 3.3 Add integration tests for `readyz` failure path (`503`).

## 4. Documentation

- [x] 4.1 Add curl examples for `healthz` and `readyz` in deployment/operations docs.

## 5. Verification

- [x] 5.1 Run full test suite and ensure coverage target remains satisfied.
- [x] 5.2 Validate OpenSpec change artifacts.
