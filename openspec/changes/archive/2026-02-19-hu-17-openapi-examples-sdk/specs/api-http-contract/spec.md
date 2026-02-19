## ADDED Requirements

### Requirement: OpenAPI operations include success and error examples
The OpenAPI contract MUST provide at least one success example and one error example per documented operation.

#### Scenario: Success example is present for response body operations
- **WHEN** an operation returns a successful response body
- **THEN** the corresponding success response content SHALL include at least one example matching schema and vendor media type

#### Scenario: Error example is present for operation error mapping
- **WHEN** an operation documents one or more error statuses
- **THEN** at least one documented error response SHALL include a ProblemDetails example matching canonical media type

### Requirement: OpenAPI examples remain contract-aligned
Examples MUST remain consistent with schema constraints and media-type rules.

#### Scenario: Success examples use vendor media type
- **WHEN** a success example is defined
- **THEN** it SHALL be under `application/vnd.budgetbuddy.v1+json` and validate against the referenced response schema

#### Scenario: Error examples use ProblemDetails media type
- **WHEN** an error example is defined
- **THEN** it SHALL be under `application/problem+json` and include required ProblemDetails fields
