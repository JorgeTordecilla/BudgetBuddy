# Frontend Review Checklist (Project Stack)

## 1) Correctness

- Route transitions:
  - `/login` renders usable form state.
  - Protected routes enforce auth without flicker loops.
  - Authenticated user visiting `/login` is redirected predictably.
- API contract:
  - `Accept` and `Content-Type` match expected media types.
  - ProblemDetails parsing uses `type/title/status/detail`.
  - `X-Request-Id` and `Retry-After` are handled where applicable.
- State behavior:
  - Loading/empty/error states are deterministic.
  - Mutation success/failure updates UI and cache correctly.

## 2) Security

- Access token:
  - In-memory only.
  - Not logged.
- Refresh session:
  - Cookie-based.
  - Requests that require cookie flow send `credentials: "include"`.
  - 401 retry logic is bounded (single retry) and deduplicated.
- Data exposure:
  - No secrets or raw backend internals shown in user-facing errors.
  - Diagnostics payload includes safe metadata only.
- Injection/XSS:
  - No unsafe HTML rendering from untrusted content.
  - Dynamic links/URLs are validated.

## 3) Performance and UX

- Avoid redundant refetch/retry storms.
- Avoid broad cache invalidation when targeted invalidation is possible.
- Validate rendering behavior under slow network and 4xx/5xx responses.
- Ensure layout remains usable on mobile widths.

## 4) Testing

- Add/adjust tests for changed critical paths:
  - Auth/session bootstrap and logout behavior.
  - 401/403/429 behavior and retry limits.
  - Error UI mapping and request-id display.
  - New route/page behavior and major interactions.
- Maintain project coverage threshold.

## 5) Reporting Format

- List findings by severity:
  - `CRITICAL`: security bug, data integrity risk, broken primary flow.
  - `WARNING`: likely regression, incomplete scenario handling.
  - `SUGGESTION`: improvement with low immediate risk.
- For each finding provide:
  - what is wrong
  - impact
  - concrete fix
  - file reference(s)
