## Purpose

Reduce repeated disk I/O and YAML parsing overhead by serving `/api/openapi.json` from an in-memory process-local cache while preserving response behavior.

## Requirements

### Requirement: OpenAPI Spec Is Loaded Once Per Process
The backend MUST load and parse the OpenAPI spec file only once per process for serving `/api/openapi.json`.

#### Scenario: First access initializes cache
- **WHEN** `/api/openapi.json` is requested for the first time (or startup preload is configured)
- **THEN** the OpenAPI YAML file is parsed and stored in a module-level cache

#### Scenario: Subsequent requests reuse cache
- **WHEN** `/api/openapi.json` is requested after cache initialization
- **THEN** the endpoint returns content from in-memory cache without re-reading the file from disk

### Requirement: Cache Initialization Is Thread-Safe
OpenAPI cache initialization MUST be safe for concurrent access in single-worker threaded execution.

#### Scenario: Concurrent first requests do not double-initialize
- **WHEN** multiple requests race before cache is initialized
- **THEN** only one initialization path persists the cached spec and all requests receive a valid response

### Requirement: Response Content Remains Stable
Caching MUST NOT change the logical content returned by `/api/openapi.json`.

#### Scenario: Cached and uncached payloads are equivalent
- **WHEN** the endpoint is compared before and after cache introduction
- **THEN** the JSON structure and values remain equivalent to existing behavior
