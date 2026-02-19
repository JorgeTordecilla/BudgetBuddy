# SDK Generation

Generated clients are deterministic and derived from `backend/openapi.yaml`.

- TypeScript generator: `budgetbuddy-ts-sdkgen@1.0.0`
- Python generator: `budgetbuddy-py-sdkgen@1.0.0`

Regenerate locally:

```bat
backend\.venv\Scripts\python.exe tools\generate_sdks.py
```

Check for drift without writing files:

```bat
backend\.venv\Scripts\python.exe tools\generate_sdks.py --check
```
