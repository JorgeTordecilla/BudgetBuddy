## MODIFIED Requirements

### Requirement: Analytics responsive readability
The analytics interface SHALL preserve trend and breakdown readability across mobile, tablet, and desktop by adapting chart, control, and data-summary layouts.

#### Scenario: Analytics interpretation on mobile
- **WHEN** a user opens Analytics on a small viewport
- **THEN** trend insights and category breakdown remain legible and interpretable without requiring horizontal table interaction as the primary mode

#### Scenario: Analytics filter controls avoid mobile overflow
- **WHEN** date range controls are rendered on a small viewport
- **THEN** controls SHALL reflow in a mobile-first layout that keeps each control fully visible
- **AND** date inputs SHALL NOT overflow their parent container width.

### Requirement: Analytics control consistency
Analytics range and overlay controls SHALL remain consistently accessible and understandable at all supported breakpoints.

#### Scenario: Range application with responsive controls
- **WHEN** a user updates analytics date controls and applies changes
- **THEN** control states, results, and error messaging remain coherent regardless of viewport size

#### Scenario: Touch-first range actions on narrow viewports
- **WHEN** analytics controls are shown on narrow screens
- **THEN** primary range-apply affordance SHALL remain easily tappable
- **AND** control ordering SHALL preserve comprehension from range selection to apply action.
