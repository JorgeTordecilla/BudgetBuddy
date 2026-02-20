## Why

Refresh tokens are transported in HttpOnly cookies and used cross-site (`SameSite=None`) for web clients.
Without an explicit anti-CSRF control on refresh, a third-party origin could trigger unintended session refresh requests.

## What Changes

- Add an origin-based anti-CSRF guard for `POST /auth/refresh` when refresh cookie transport is cross-site.
- Add configurable behavior for requests without `Origin` (CLI/non-browser clients):
  - `deny`
  - `allow_trusted`
- Add canonical ProblemDetails mapping for blocked origin decisions.
- Add integration tests for allowed vs denied origin and missing-origin mode behavior.

## Impact

- Reduces CSRF risk for cookie-based refresh in browser cross-site deployments.
- Preserves operational flexibility for trusted non-browser calls via explicit configuration.
- Keeps error responses deterministic and aligned with ProblemDetails catalog.
