## ADDED Requirements

### Requirement: Category archived conflict on transaction writes
The API SHALL reject transaction writes that resolve to an archived category using canonical `409` ProblemDetails.

#### Scenario: Create transaction with archived category returns canonical conflict
- **WHEN** `POST /transactions` references a category whose `archived_at != null`
- **THEN** the API SHALL return `409` with `Content-Type: application/problem+json` and exact `type=https://api.budgetbuddy.dev/problems/category-archived`, `title=Category is archived`, `status=409`

#### Scenario: Patch transaction to archived category returns canonical conflict
- **WHEN** `PATCH /transactions/{transaction_id}` changes `category_id` to a category whose `archived_at != null`
- **THEN** the API SHALL return `409` with `Content-Type: application/problem+json` and exact `type=https://api.budgetbuddy.dev/problems/category-archived`, `title=Category is archived`, `status=409`

#### Scenario: Patch transaction keep-path with archived effective category returns canonical conflict
- **WHEN** `PATCH /transactions/{transaction_id}` does not change `category_id` but the effective linked category is archived
- **THEN** the API SHALL return the same canonical `409` category-archived ProblemDetails
