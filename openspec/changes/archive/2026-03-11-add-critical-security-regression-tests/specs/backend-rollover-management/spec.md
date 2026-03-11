## MODIFIED Requirements

### Requirement: Rollover preview endpoint is deterministic and side-effect free
The backend MUST provide `GET /rollover/preview?month=YYYY-MM` as a read-only endpoint returning source-month surplus and application state.

#### Scenario: Preview rejects invalid month value
- **WHEN** preview receives an invalid `month` value
- **THEN** API SHALL return canonical `400` ProblemDetails with invalid-date-range semantics

### Requirement: Rollover apply endpoint materializes exactly one next-month income transaction
The backend MUST provide `POST /rollover/apply` that creates one income transaction on next-month day 1 using computed source-month surplus.

#### Scenario: Apply rejects invalid source month value
- **WHEN** apply receives an invalid `source_month` value
- **THEN** API SHALL return canonical `400` ProblemDetails with invalid-date-range semantics
