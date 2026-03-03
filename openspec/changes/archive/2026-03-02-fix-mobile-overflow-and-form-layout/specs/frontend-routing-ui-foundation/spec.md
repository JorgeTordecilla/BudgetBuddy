## MODIFIED Requirements

### Requirement: Responsive app shell hierarchy
The app shell SHALL present a consistent visual hierarchy for title, contextual actions, and navigation across mobile, tablet, and desktop breakpoints, including keyboard-driven viewport transitions on mobile.

#### Scenario: Shell layout at breakpoint transitions
- **WHEN** the viewport changes between mobile, tablet, and desktop widths
- **THEN** shell content reflows without overlap, clipped controls, or hidden primary actions

#### Scenario: Mobile auth layout remains stable around virtual keyboard transitions
- **WHEN** a user on a mobile viewport opens and closes the virtual keyboard while interacting with `/login` or `/register`
- **THEN** the layout SHALL return to a stable viewport-aligned position
- **AND** the page SHALL NOT remain in an unintended zoomed visual state

#### Scenario: Fixed mobile navigation preserves page reachability
- **WHEN** fixed bottom navigation and floating transaction action controls are present on mobile routes
- **THEN** app shell spacing SHALL account for safe-area insets and fixed control stack height
- **AND** bottom page content and interactive controls SHALL remain reachable without being obscured.
