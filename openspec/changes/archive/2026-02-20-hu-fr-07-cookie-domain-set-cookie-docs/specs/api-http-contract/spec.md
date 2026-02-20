## ADDED Requirements

### Requirement: Auth Set-Cookie domain policy is explicit
The HTTP contract MUST explicitly describe refresh-cookie `Domain` behavior so clients can reason about host-only and shared-subdomain deployments.

#### Scenario: Login and refresh Set-Cookie describe default host-only behavior
- **WHEN** `Set-Cookie-Refresh` header docs are reviewed for auth success responses
- **THEN** they SHALL state that `Domain` is omitted by default, yielding a host-only cookie scoped to the API host

#### Scenario: Contract documents optional configured Domain attribute
- **WHEN** deployers set `REFRESH_COOKIE_DOMAIN`
- **THEN** docs SHALL state that `Set-Cookie` may include `Domain=<configured_domain>` for shared-subdomain cookie scope

#### Scenario: Logout clear-cookie semantics preserve domain policy clarity
- **WHEN** `Set-Cookie-Refresh-Cleared` header docs are reviewed
- **THEN** they SHALL document the same default/optional `Domain` behavior for deterministic cookie clearing
