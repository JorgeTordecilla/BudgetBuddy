## ADDED Requirements

### Requirement: Archived semantics are explicit in API contract
The OpenAPI contract MUST explicitly describe soft-delete archive behavior for accounts, categories, and transactions.

#### Scenario: Delete operations are documented as archive semantics
- **WHEN** `/accounts/{account_id}`, `/categories/{category_id}`, and `/transactions/{transaction_id}` delete operations are reviewed
- **THEN** descriptions SHALL state archive (soft-delete) semantics and not hard-delete semantics

#### Scenario: Ownership and authz wording remains canonical
- **WHEN** archived-resource access responses are documented
- **THEN** canonical `401/403/406` wording SHALL remain consistent with contract conventions

### Requirement: List endpoint archived policy is explicit
List endpoints MUST document default exclusion of archived resources and opt-in inclusion behavior.

#### Scenario: Default list behavior excludes archived resources
- **WHEN** list endpoints for accounts/categories/transactions are documented
- **THEN** documentation SHALL state archived resources are excluded unless `include_archived=true`

#### Scenario: include_archived toggle includes archived resources
- **WHEN** `include_archived=true` is provided
- **THEN** contract SHALL specify that archived resources are included in list results
