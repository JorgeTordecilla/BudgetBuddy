## 1. OpenAPI Example Coverage

- [x] 1.1 Add at least one success and one error example for each documented endpoint response set in `backend/openapi.yaml`.
- [x] 1.2 Add canonical ProblemDetails examples for `400`, `401`, `403`, `406`, `409`, and `429` and reference them consistently.
- [x] 1.3 Mirror OpenAPI example updates into `openspec/specs/openapi.yaml`.

## 2. SDK Tooling and Generation

- [x] 2.1 Add pinned OpenAPI generator configuration files for TypeScript and Python outputs.
- [x] 2.2 Add deterministic local generation commands/scripts for both SDK targets.
- [x] 2.3 Generate and commit `sdk/typescript` and `sdk/python` artifacts from the current OpenAPI spec.

## 3. CI Automation and Docs

- [x] 3.1 Add CI step to validate OpenAPI contract file before generation checks.
- [x] 3.2 Add CI step that regenerates SDKs and fails build on diff.
- [x] 3.3 Document local validation and SDK regeneration workflow (including pinned versions/prereqs).

## 4. Tests and Verification

- [x] 4.1 Run OpenAPI validation and SDK generator commands locally and fix issues.
- [x] 4.2 Run full backend tests from `backend` using `.venv\Scripts\python.exe -m pytest`.
- [x] 4.3 Run coverage check from `backend` using `.venv\Scripts\python.exe -m pytest --cov=app --cov-report=term-missing` and confirm `>= 90%`.
- [x] 4.4 Verify no contract regressions beyond additive examples/SDK tooling changes.
