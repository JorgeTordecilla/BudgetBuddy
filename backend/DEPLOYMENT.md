# Deployment Notes (Neon)

1. Set `DATABASE_URL` with Neon connection string and `sslmode=require`.
2. Apply `backend/migrations/001_init.sql` against Neon.
3. Configure `JWT_SECRET`, token TTL env vars, and deploy API service.
4. Run smoke tests: auth register/login/refresh/logout, CRUD resources, analytics endpoints.

Rollback:
- Roll back app release to previous image.
- If schema rollback is needed, apply inverse DDL for newly added objects in a controlled migration.
- Revoke active refresh tokens if JWT secret rotation occurs.
