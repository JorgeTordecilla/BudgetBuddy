# Deployment Notes (Neon)

1. Set `DATABASE_URL` with Neon connection string and `sslmode=require`.
2. Apply schema changes only through Alembic migrations (from `backend/`: `.venv\Scripts\python.exe -m alembic upgrade head`).
3. Configure `JWT_SECRET`, token TTL env vars, and deploy API service.
4. Run smoke tests: auth register/login/refresh/logout, CRUD resources, analytics endpoints.

Important:
- The API startup does not run `Base.metadata.create_all(...)`.
- Production schema management must go through Alembic revisions only.

Rollback:
- Roll back app release to previous image.
- If schema rollback is needed, apply inverse DDL for newly added objects in a controlled migration.
- Revoke active refresh tokens if JWT secret rotation occurs.
