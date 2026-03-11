
# Login Flow & Monitoring Documentation

## Login Flow
1. **Frontend**: `src/app/login/page.js` collects username/password.
2. **API Call**: POST request sent to `/api/auth/login`.
3. **API Route (Next.js)**: `src/app/api/auth/login/route.js`:
   - Validates input.
   - Finds user in PostgreSQL via Prisma (`src/lib/prisma.js`).
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
1. **Database Connection**: Ensure the app can connect to the Neon PostgreSQL database.
   - Check `DATABASE_URL` environment variable.
   - Verify Prisma client initialization.
2. **Dependencies**: Ensure `bcryptjs` and `jsonwebtoken` are installed and compatible.
   - *Issue Found*: Previous deployment had package conflicts. Resolved by aligning versions.
3. **User Account**: Ensure the user exists and has a valid password hash.
   - The login page includes a helper call to seed an owner user via `/api/auth/seed-owner` (see `src/app/login/page.js`).
4. **Network**: Ensure the browser can reach the API routes.
   - This project calls relative API paths via `src/lib/api.js` (base URL is `/api`).

## Monitoring Suggestions
To prevent future occurrences:
1. **Uptime Monitoring**: Set up a ping check for `/api/auth/login` or a dedicated health endpoint if you add one.
2. **Error Logging**: Integrate Sentry or similar tool to capture server exceptions.
   - Currently, errors are logged to console (`console.error`).
3. **Database Alerts**: Monitor database connection pool usage and latency.
4. **Smoke Tests**: Add CI that runs lint + unit tests + a `next build`.

## Verification
- **Unit Tests**: Jest tests live under `src/components/__tests__/` (see `jest.config.js`).
