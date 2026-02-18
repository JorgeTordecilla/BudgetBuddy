## 1. Test matrix setup

- [x] 1.1 Add directional mismatch cases for `POST /transactions` covering `income->expense` and `expense->income`
- [x] 1.2 Reuse minimal account/category setup helpers to avoid duplicated boilerplate in integration tests

## 2. Patch-path coverage

- [x] 2.1 Add directional mismatch cases for `PATCH /transactions/{transaction_id}` by changing `category_id` and/or `type`
- [x] 2.2 Ensure patch mismatch tests assert unchanged behavior for non-mismatch flows

## 3. Contract assertions

- [x] 3.1 Assert mismatch responses always return `application/problem+json`
- [x] 3.2 Assert exact canonical mismatch ProblemDetails (`type`, `title`, `status`) in every directional case

## 4. Verification

- [x] 4.1 Run full test suite with coverage
- [x] 4.2 Confirm overall coverage remains >= 90%
