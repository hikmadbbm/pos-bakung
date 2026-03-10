
# Login Flow & Monitoring Documentation

## Login Flow
1. **Frontend**: `src/app/login/page.js` collects username/password.
2. **API Call**: POST request sent to `/api/auth/login`.
3. **Backend**: `backend/src/routes/auth.js`:
   - Validates input.
   - Finds user in PostgreSQL database via Prisma.
   - Compares password hash using `bcryptjs`.
   - Generates JWT token using `jsonwebtoken`.
   - Updates `last_login` timestamp.
   - Logs activity in `UserActivityLog`.
4. **Response**: Returns JWT token and user info.
5. **Frontend Success**:
   - Stores token in `localStorage`.
   - Sets user context.
   - Shows `PostLoginModal` (which handles redirection).

## Troubleshooting "Critical Login Server Error"
If users report login errors, check the following:
1. **Database Connection**: Ensure the backend can connect to the Neon PostgreSQL database.
   - Check `DATABASE_URL` environment variable.
   - Verify Prisma client initialization.
2. **Dependencies**: Ensure `bcryptjs` and `jsonwebtoken` are installed and compatible.
   - *Issue Found*: Previous deployment had package conflicts. Resolved by aligning versions.
3. **User Account**: Ensure the user exists and has a valid password hash.
   - Use `node backend/seed-user.js` to create a default owner account if needed.
4. **Network/CORS**: Ensure the frontend is calling the correct API URL.
   - Check `NEXT_PUBLIC_API_URL` or relative path logic in `frontend/src/lib/api.js`.

## Monitoring Suggestions
To prevent future occurrences:
1. **Uptime Monitoring**: Set up a ping check for `/api/health` endpoint.
2. **Error Logging**: Integrate Sentry or similar tool to capture backend exceptions.
   - Currently, errors are logged to console (`console.error`).
3. **Database Alerts**: Monitor database connection pool usage and latency.
4. **End-to-End Tests**: Run `backend/tests/login-e2e.js` periodically or in CI/CD pipeline.

## Verification
- **Unit Tests**: `frontend/src/app/login/LoginPage.test.js` verifies UI rendering and interaction.
- **E2E Tests**: `backend/tests/login-e2e.js` verifies the actual API login flow against the local database.
