## MODIFIED Requirements

### Requirement: Modal behavior MUST remain usable across responsive breakpoints
Modal and dialog layouts SHALL remain accessible and readable on mobile and desktop, including during virtual keyboard open/close transitions.

#### Scenario: Small viewport remains operable
- **WHEN** dialog is rendered on narrow screens
- **THEN** content SHALL remain reachable without hidden actions
- **AND** primary/secondary actions SHALL remain visible and clickable.

#### Scenario: Modal remains stable when mobile keyboard opens and closes
- **WHEN** a user edits a form field inside a modal on a mobile viewport
- **THEN** modal content SHALL remain scrollable within the dialog container
- **AND** dismiss/submit actions SHALL remain operable after the keyboard closes.

#### Scenario: ARIA metadata is complete
- **WHEN** a modal or dialog renders
- **THEN** `role="dialog"` or equivalent accessible primitive semantics SHALL be present
- **AND** title/description associations SHALL be correctly exposed to assistive technology.

#### Scenario: Modal content prevents horizontal control overflow
- **WHEN** form controls with intrinsic width behavior (for example date fields) render inside modal content on narrow screens
- **THEN** modal content containers SHALL constrain control width to available space
- **AND** modal interaction SHALL NOT require horizontal scrolling to reach or edit fields.
