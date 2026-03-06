## MODIFIED Requirements

### Requirement: Mobile-first primary navigation
The frontend SHALL provide persistent, thumb-friendly primary navigation for authenticated routes on small viewports while preserving an equivalent desktop navigation model on larger viewports.

#### Scenario: Mobile bottom navigation remains viewport-bounded across browsers
- **WHEN** an authenticated user navigates on iOS Safari/Chrome/Brave or Android Chrome/Brave
- **THEN** the fixed bottom navigation container SHALL remain fully inside the visual viewport width
- **AND** no horizontal page overflow SHALL be introduced by the navigation shell.

### Requirement: Responsive app shell hierarchy
The app shell SHALL present a consistent visual hierarchy for title, contextual actions, and navigation across mobile, tablet, and desktop breakpoints, including keyboard-driven viewport transitions on mobile.

#### Scenario: Mobile shell remains stable during browser toolbar and keyboard transitions
- **WHEN** browser chrome or virtual keyboard changes visual viewport dimensions on mobile
- **THEN** fixed shell controls (bottom nav and floating actions) SHALL preserve reachable placement
- **AND** layout SHALL remain bounded without clipped or off-screen controls.
