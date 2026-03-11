## MODIFIED Requirements

### Requirement: Transactions CRUD and money invariants
The backend MUST implement `/transactions` and `/transactions/{transaction_id}` with create, list, get, update, archive, and restore semantics including all documented filters, while enforcing strict money invariants for `amount_cents` and currency consistency.

#### Scenario: amount_cents is rejected when zero or sign-invalid
- **WHEN** a transaction write provides `amount_cents=0` or a sign that violates the domain sign rule for the effective transaction type
- **THEN** the API SHALL reject with canonical validation `400` ProblemDetails
- **AND** automated backend regression coverage SHALL include transaction creation with negative `amount_cents` enforced through money-invariant domain validation
