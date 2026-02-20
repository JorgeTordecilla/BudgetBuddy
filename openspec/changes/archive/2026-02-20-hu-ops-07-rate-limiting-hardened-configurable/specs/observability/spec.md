## ADDED Requirements

### Requirement: Throttling decisions are operationally observable
Rate-limit rejections MUST emit structured operational logs for tuning and incident analysis.

#### Scenario: Rate-limited requests emit structured event
- **WHEN** any protected endpoint rejects request with `429`
- **THEN** logs SHALL include a structured `rate_limited` event with `request_id`, `method`, `path`, and `retry_after`

#### Scenario: Rate-limit logs avoid secret leakage
- **WHEN** throttling metadata is logged
- **THEN** logs SHALL NOT include raw tokens, credentials, or secret-bearing values
