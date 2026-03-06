## MODIFIED Requirements

### Requirement: Date and month picker controls SHALL remain bounded on mobile viewports
The frontend SHALL render date/month selection controls using a shared picker implementation that prevents horizontal overflow on supported mobile browsers.

#### Scenario: Date/month picker interaction does not trigger hidden text selection artifacts
- **WHEN** a user opens date or month selection from modal forms on iOS Safari/Chrome/Brave or Android Chrome/Brave
- **THEN** the interaction SHALL not expose hidden text-selection handles or ghost-selected values
- **AND** picker interaction SHALL remain within the intended button/popover flow.
