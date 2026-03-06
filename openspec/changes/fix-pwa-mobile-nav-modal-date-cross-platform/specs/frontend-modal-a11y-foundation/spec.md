## MODIFIED Requirements

### Requirement: Modal behavior MUST remain usable across responsive breakpoints
Modal and dialog layouts SHALL remain accessible and readable on mobile and desktop, including during virtual keyboard open/close transitions.

#### Scenario: Mobile modal geometry is rounded and clipped consistently
- **WHEN** dialog or modal content is rendered on narrow screens
- **THEN** the modal surface SHALL preserve rounded corners and clipping boundaries
- **AND** header/body/footer layers SHALL not render square-edge overflow artifacts.

#### Scenario: Mobile modal remains contained while keyboard is active
- **WHEN** a user focuses inputs in a modal on iOS or Android
- **THEN** modal content SHALL remain vertically scrollable within its container
- **AND** modal width SHALL remain bounded without horizontal overflow.
