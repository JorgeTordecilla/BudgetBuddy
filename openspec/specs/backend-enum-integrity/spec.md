## Purpose

Ensure domain enum values are defined once and enforced consistently across ORM models, database schema, and Pydantic API schemas.

## Requirements

### Requirement: Shared Domain Enum Definitions
The backend MUST define a shared set of Python Enum classes for domain-constrained values used by models and API schemas.

#### Scenario: Required enums are defined
- **WHEN** developers inspect backend domain enum definitions
- **THEN** `TransactionType`, `CategoryType`, `AccountType`, `SavingsGoalStatus`, `TransactionMood`, and `IncomeFrequency` exist as Python Enum classes

#### Scenario: Enum values remain API-compatible
- **WHEN** enum values are serialized to request/response payloads
- **THEN** they match the currently accepted string values used by existing API behavior

### Requirement: Enum-Enforced ORM and Database Columns
Targeted enum-like model columns MUST be represented with SQLAlchemy Enum types and enforced at the database schema level.

#### Scenario: Models use SAEnum for targeted fields
- **WHEN** developers inspect model column declarations
- **THEN** targeted enum-backed fields use `SAEnum(MyEnum)` instead of unconstrained `String`

#### Scenario: Database rejects invalid enum values
- **WHEN** a write attempts to persist an out-of-domain value in an enum-backed column
- **THEN** the database rejects the write through enum/check enforcement

### Requirement: Alembic Migration for Enum Schema Changes
The backend MUST include an Alembic migration that applies enum-related schema changes for all targeted columns.

#### Scenario: Migration upgrades enum constraints/types
- **WHEN** migration upgrade is executed
- **THEN** targeted columns receive enum-compatible schema enforcement without breaking existing valid data

#### Scenario: Migration downgrade restores prior schema compatibility
- **WHEN** migration downgrade is executed
- **THEN** schema changes are reverted consistently for targeted enum columns

### Requirement: Pydantic Schemas Reuse Shared Enums
Pydantic request/response models MUST reference the same shared Enum classes used by ORM definitions for targeted domains.

#### Scenario: Schemas no longer duplicate enum literals for targeted fields
- **WHEN** developers inspect schema field annotations
- **THEN** targeted fields reference shared enum types instead of duplicated string literal unions

#### Scenario: Existing logic remains unchanged
- **WHEN** backend tests are executed after enum migration
- **THEN** tests pass without requiring business-logic changes
