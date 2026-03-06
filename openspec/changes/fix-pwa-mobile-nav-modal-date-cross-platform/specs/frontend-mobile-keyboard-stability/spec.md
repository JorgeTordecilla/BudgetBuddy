## MODIFIED Requirements

### Requirement: Mobile viewport transitions SHALL remain visually stable during keyboard open/close
The frontend SHALL handle virtual keyboard open/close transitions without persistent viewport jumps, clipped content, or residual zoom state.

#### Scenario: Date/month field triggers do not summon keyboard unexpectedly
- **WHEN** users interact with date/month picker triggers in modal forms
- **THEN** virtual keyboard SHALL not open unless an editable text input is intentionally focused
- **AND** no residual text-selection state SHALL remain after picker close.
