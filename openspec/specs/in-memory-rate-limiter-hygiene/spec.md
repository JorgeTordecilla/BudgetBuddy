## Purpose

Define bounded-memory behavior for in-memory rate limiters so expired inactive buckets do not accumulate indefinitely in long-lived backend processes.

## Requirements

### Requirement: In-memory limiter state remains bounded over time
The in-memory backend rate limiter MUST periodically evict expired inactive buckets so long-lived processes do not accumulate unbounded limiter state, and each bucket MUST preserve the active `window_seconds` policy that governs its own cleanup and rollover behavior.

#### Scenario: Expired unlocked buckets are evicted during passive cleanup
- **WHEN** a limiter bucket window has expired according to that bucket's stored `window_seconds`
- **AND** the bucket is not actively locked
- **THEN** passive cleanup SHALL remove that bucket from in-memory state

#### Scenario: Active lock buckets are retained until lock expiry
- **WHEN** a limiter bucket is still within `lock_until`
- **THEN** passive cleanup SHALL NOT evict it before the lock expires

#### Scenario: Cleanup does not change active throttling semantics
- **WHEN** passive cleanup runs while active buckets still fall within their current stored window or lock interval
- **THEN** limiter allow/deny behavior SHALL remain unchanged for those active identities

#### Scenario: Passive cleanup respects heterogeneous bucket windows
- **WHEN** passive cleanup runs across buckets created with different `window_seconds` values
- **THEN** each bucket SHALL be evaluated for inactivity using its own stored window policy
- **AND** a longer-window bucket SHALL NOT be evicted solely because cleanup was triggered by a shorter-window request

#### Scenario: Active bucket keeps its current window until rollover
- **WHEN** an existing bucket is checked with a different `window_seconds` than the one stored on its active window
- **AND** that active window has not yet expired
- **THEN** the bucket SHALL continue using its stored `window_seconds` for expiry and retry calculations during that active window

#### Scenario: Expired bucket adopts the caller window on reset
- **WHEN** an existing bucket's active window has expired
- **AND** the next `check(...)` call provides a different `window_seconds`
- **THEN** the bucket SHALL reset using the current caller's `window_seconds`
- **AND** the new active window SHALL use that updated value
