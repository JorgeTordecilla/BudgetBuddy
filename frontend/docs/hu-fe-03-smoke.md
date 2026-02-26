# HU-FE-03 Smoke Verification

1. Start backend and frontend (`npm run dev` in `frontend/`).
2. Login with a valid user.
3. Open `/app/accounts`.
4. Create an account and confirm it appears in the list.
5. Archive the account, enable `Show archived`, and confirm it appears as archived.
6. Open `/app/categories`.
7. Create a category and confirm it appears in the list.
8. Archive the category and confirm `Restore` action is visible.
9. Click `Restore` and confirm the category returns to active state.
10. Change category type filter and confirm list reloads without stale rows.
