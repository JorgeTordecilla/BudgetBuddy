## MODIFIED Requirements

### Requirement: Transactions responsive data rendering
The transactions page SHALL provide card/list rendering on small viewports and dense table rendering on larger viewports using the same underlying data and actions, and SHALL prevent horizontal overflow for filter/form controls in mobile containers.

#### Scenario: Transactions without mobile horizontal dependency
- **WHEN** a user opens Transactions on a small viewport
- **THEN** transaction records are readable and actionable without requiring horizontal table scrolling

#### Scenario: Filter controls remain within mobile container bounds
- **WHEN** the transactions filter surface renders on a small viewport
- **THEN** date and select controls SHALL remain within container width
- **AND** horizontal page overflow SHALL NOT be introduced by filter controls.

#### Scenario: Transaction form controls remain within modal bounds
- **WHEN** a user opens the create or edit transaction modal on a small viewport
- **THEN** all form controls (including date inputs) SHALL remain within modal content width
- **AND** modal interaction SHALL NOT require horizontal scrolling.

### Requirement: Transactions action accessibility
Transactions actions (create, edit, archive, restore, import, export) SHALL remain discoverable and operable across breakpoints with keyboard and touch support.

#### Scenario: Action parity across viewport sizes
- **WHEN** a user performs transaction actions on mobile or desktop
- **THEN** equivalent actions are available with clear affordances and consistent feedback states

#### Scenario: Mobile create action remains singular and persistent
- **WHEN** a user is on Transactions in a small viewport
- **THEN** create transaction access SHALL remain available through a persistent touch-friendly action control
- **AND** duplicate top-level create controls MAY be reduced to avoid header crowding while preserving functionality.
