## 1. Error contract updates

- [x] 1.1 Add centralized category-type-mismatch ProblemDetails constants/helper (`type`, `title`, `status`) in shared error module
- [x] 1.2 Ensure global API error handling keeps `application/problem+json` and emits canonical mismatch fields

## 2. Transaction validation updates

- [x] 2.1 Update transaction business-rule validation to raise dedicated mismatch APIError when `transaction.type != category.type`
- [x] 2.2 Ensure both create and update transaction flows validate the effective final `type` and `category_id` and apply the same mismatch rule

## 3. Tests and verification

- [x] 3.1 Add integration test for `POST /transactions` mismatch (`category.type` vs `type`) returning `409`
- [x] 3.2 Add integration test for `PATCH /transactions/{transaction_id}` mismatch returning `409`
- [x] 3.3 Assert exact ProblemDetails fields (`type`, `title`, `status`) and `application/problem+json`
- [x] 3.4 Run tests with coverage and keep overall coverage >= 90%
