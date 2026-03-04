## Context

Frontend pages currently mix two mental models for money:
- backend contract model: integer cents (`amount_cents`, `expected_amount_cents`, `limit_cents`);
- user mental model: major currency units (for example `4,000,000 COP`).

Because several screens expose raw cents fields and values, users can enter valid-looking business amounts that are interpreted at the wrong scale. The backend is contract-correct; the UX contract is the weak point.

Constraints:
- Preserve backend contract (`*_cents` integers).
- Preserve vendor media types and ProblemDetails behavior.
- Keep deterministic behavior across base currencies (`USD`, `COP`, `EUR`, `MXN`).

## Goals / Non-Goals

**Goals:**
- Move user-facing money entry to major units while converting to integer cents before API writes.
- Display money values using session `currency_code` consistently in transactions, income sources, analytics, and dashboard.
- Provide clear validation and field-level guidance for invalid money input.
- Add regression tests for parsing, conversion, and UI rendering.

**Non-Goals:**
- No backend schema or endpoint changes.
- No change to persisted integer-cents model.
- No expansion to unsupported currencies beyond current base set.

## Decisions

### D1. Introduce shared money parser/formatter boundary in frontend
Create/extend shared utility functions for:
- `parseMoneyInputToCents(currencyCode, input) -> number | error`
- `formatCents(currencyCode, cents) -> localized string`
- optional normalization helper for form defaults/edit mode.

Rationale:
- Avoid page-specific ad-hoc conversion logic.
- Enforce one deterministic conversion rule across flows.

Alternative considered:
- Keep per-page conversion logic.
  - Rejected: high drift risk and inconsistent validation messages.

### D2. Keep API payloads integer cents, change only UX surface
Forms will accept major-unit user input and convert to cents on submit.

Rationale:
- Preserves existing backend contract and tests.
- Minimizes cross-layer migration risk.

Alternative considered:
- Change backend contract to major units.
  - Rejected: high breaking risk and unnecessary for this problem.

### D3. Support base currencies with deterministic precision rules
Use currency-aware parsing/formatting rules for `USD`, `COP`, `EUR`, `MXN` and keep conversion deterministic.

Rationale:
- Eliminates scale confusion while preserving consistent math.
- Aligns display with user account currency.

Alternative considered:
- Force two-decimal fixed logic for all screens.
  - Rejected: poorer locale/currency UX and future extensibility.

### D4. Improve form UX copy and visual feedback
Replace cents-centric labels/help text with user-centric money language and add inline field validation.

Rationale:
- Prevents repeated input-scale mistakes.
- Reduces support/debug effort.

## Risks / Trade-offs

- **[Risk]** Conversion edge cases (locale separators, decimal precision) produce wrong cents.  
  **Mitigation:** centralized parser + unit tests per base currency + strict invalid-input feedback.

- **[Risk]** Mixed rendering styles remain in some screens.  
  **Mitigation:** require usage of shared formatter in modified capabilities and add snapshot/assertion tests.

- **[Risk]** Existing tests tied to raw-cents labels fail.  
  **Mitigation:** update tests intentionally and keep payload assertions in cents to preserve contract guarantees.

## Migration Plan

1. Add/extend shared money conversion utilities and tests.
2. Update transaction and income-source forms to accept major-unit inputs.
3. Update list/cards/analytics displays to format with session currency consistently.
4. Update component/page tests and run frontend verification commands.
5. Confirm no backend/API contract changes and archive change.

Rollback:
- Revert frontend utility and form/display changes together; backend remains untouched.

## Open Questions

- Should `COP` input allow decimal fractions in UI or be constrained to whole units while still converting to cents internally?
- Should transaction tables display both formatted value and optional compact raw cents in developer/debug mode only?
