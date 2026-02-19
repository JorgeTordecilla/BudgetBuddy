## ADDED Requirements

### Requirement: Deterministic paging without duplicates or skips for stable datasets
Domain list pagination MUST return deterministic page slices for stable datasets.

#### Scenario: Accounts pagination over 25 records with limit 10
- **WHEN** `GET /accounts?limit=10` is paged until `next_cursor=null`
- **THEN** combined pages SHALL contain all expected records with no duplicates and no skipped items

#### Scenario: Categories pagination over 25 records with limit 10
- **WHEN** `GET /categories?limit=10` is paged until `next_cursor=null`
- **THEN** combined pages SHALL contain all expected records with no duplicates and no skipped items

#### Scenario: Transactions pagination over 25 records with limit 10
- **WHEN** `GET /transactions?limit=10` is paged until `next_cursor=null`
- **THEN** combined pages SHALL contain all expected records with no duplicates and no skipped items

### Requirement: Endpoint sort order and cursor boundary predicates are consistent
Each list endpoint MUST apply cursor boundary predicates using the same ordered fields used in `ORDER BY`.

#### Scenario: Cursor boundary matches account ordering
- **WHEN** account list applies cursor filtering
- **THEN** boundary predicates SHALL be based on the same ordered fields as account query sorting

#### Scenario: Cursor boundary matches category ordering
- **WHEN** category list applies cursor filtering
- **THEN** boundary predicates SHALL be based on the same ordered fields as category query sorting

#### Scenario: Cursor boundary matches transaction ordering
- **WHEN** transaction list applies cursor filtering
- **THEN** boundary predicates SHALL be based on the same ordered fields as transaction query sorting
