## Purpose

Define bounded-memory behavior for in-memory rate limiters so expired inactive buckets do not accumulate indefinitely in long-lived backend processes.

## Requirements

### Requirement: In-memory limiter state remains bounded over time
The in-memory backend rate limiter MUST periodically evict expired inactive buckets so long-lived processes do not accumulate unbounded limiter state.

#### Scenario: Expired unlocked buckets are evicted during passive cleanup
- **WHEN** a limiter bucket window has expired and the bucket is not actively locked
- **THEN** passive cleanup SHALL remove that bucket from in-memory state

#### Scenario: Active lock buckets are retained until lock expiry
- **WHEN** a limiter bucket is still within `lock_until`
- **THEN** passive cleanup SHALL NOT evict it before the lock expires

#### Scenario: Cleanup does not change active throttling semantics
- **WHEN** passive cleanup runs while active buckets still fall within their current window or lock interval
- **THEN** limiter allow/deny behavior SHALL remain unchanged for those active identities
