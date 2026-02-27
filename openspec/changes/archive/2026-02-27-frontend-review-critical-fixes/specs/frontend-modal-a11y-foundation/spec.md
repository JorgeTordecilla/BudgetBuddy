## ADDED Requirements

### Requirement: Shared modal and dialog primitives MUST be keyboard accessible
Frontend modal and dialog components SHALL implement deterministic keyboard navigation and ARIA semantics.

#### Scenario: Dialog traps focus while open
- **WHEN** a modal or dialog opens
- **THEN** keyboard focus SHALL move inside the dialog
- **AND** tab navigation SHALL remain trapped within dialog controls until close.

#### Scenario: Dialog restores focus on close
- **WHEN** user closes a modal or dialog
- **THEN** focus SHALL return to the invoking control
- **AND** page keyboard flow SHALL remain continuous.

#### Scenario: Escape handling is deterministic
- **WHEN** user presses `Escape` in a dismissible dialog
- **THEN** dialog SHALL close
- **AND** non-dismissible/confirming states SHALL block close with clear UX behavior.

### Requirement: Modal behavior MUST remain usable across responsive breakpoints
Modal and dialog layouts SHALL remain accessible and readable on mobile and desktop.

#### Scenario: Small viewport remains operable
- **WHEN** dialog is rendered on narrow screens
- **THEN** content SHALL remain reachable without hidden actions
- **AND** primary/secondary actions SHALL remain visible and clickable.

#### Scenario: ARIA metadata is complete
- **WHEN** a modal or dialog renders
- **THEN** `role="dialog"` or equivalent accessible primitive semantics SHALL be present
- **AND** title/description associations SHALL be correctly exposed to assistive technology.

