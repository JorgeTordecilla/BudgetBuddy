## Purpose
Define backend resilience requirements for transaction import jobs, including asynchronous processing, backpressure, idempotency, and observability.

## Requirements

### Requirement: Transactions import submission is asynchronous and queue-backed
The backend MUST accept import requests without tying up API request threads for full import execution, and MUST retain terminal job status only within bounded retention policy.

#### Scenario: Import request is accepted as a job
- **WHEN** client submits `POST /transactions/import/jobs`
- **THEN** API returns `202 Accepted` with a `job_id` and initial status.
- **AND** job is persisted/enqueued for background processing.

#### Scenario: Client can query retained job status
- **WHEN** client requests import job status for a retained job
- **THEN** API returns deterministic state (`queued`, `running`, `completed`, `failed`) and progress/result metadata.

#### Scenario: Terminal job lookup after retention window is no longer available
- **WHEN** a terminal import job exceeds configured retention and is evicted
- **THEN** status lookup SHALL be treated as not available by the same canonical path used for unknown/non-owned jobs.

### Requirement: Backend enforces backpressure under high concurrency
Import traffic spikes MUST degrade gracefully and keep core API available.

#### Scenario: Per-user concurrency is limited
- **WHEN** a user exceeds allowed active import jobs
- **THEN** API rejects additional submissions with `429` and retry guidance.

#### Scenario: Global queue/worker capacity is protected
- **WHEN** system queue depth or worker capacity crosses configured thresholds
- **THEN** new import submissions are throttled/rejected with `429`.
- **AND** existing jobs continue processing without service collapse.

### Requirement: Import submissions are idempotent for safe retries
Repeated import submissions with the same idempotency key MUST not duplicate side effects within a bounded idempotency retention window.

#### Scenario: Same idempotency key reuses existing job outcome while retained
- **WHEN** client retries `POST /transactions/import/jobs` with the same `Idempotency-Key` within idempotency retention
- **THEN** backend returns the existing accepted/completed job reference.
- **AND** duplicate transaction insertion is prevented.

#### Scenario: Same idempotency key after retention is treated as new submission
- **WHEN** the idempotency record has expired and client reuses the same `Idempotency-Key`
- **THEN** backend SHALL treat the request as a fresh submission under current queue/backpressure rules.

#### Scenario: Payload mismatch conflict remains deterministic while key is retained
- **WHEN** `Idempotency-Key` is reused with a different payload while the key record is still retained
- **THEN** backend SHALL reject with `409` conflict semantics.

### Requirement: System behavior remains observable and testable
Operations MUST expose enough signals to validate resilience behavior, including retention cleanup effects.

#### Scenario: Queue, rejection, and cleanup metrics are emitted
- **WHEN** imports are processed, throttled, or retention cleanup runs
- **THEN** system emits metrics/logs for queue depth, active workers, accept/reject counts, job outcomes, and cleanup eviction counts.

#### Scenario: Resilience tests cover burst traffic and retention boundaries
- **WHEN** automated validation runs
- **THEN** tests verify that burst submission triggers controlled queueing/throttling.
- **AND** tests verify bounded retention behavior for terminal jobs and idempotency records using deterministic time control.
