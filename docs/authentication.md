# Authentication

This document explains the current JurisFlow authentication flow for local testing, Postman usage, and implementation details.

## Current Scope

Implemented:

- Password hashing with PBKDF2.
- JWT access token.
- JWT refresh token.
- Login endpoint.
- Refresh endpoint.
- Current-user endpoint.
- Frontend login screen and authenticated layout.
- RBAC middleware.
- Protected API routes for clients, cases, payments, finance, and users.
- Forgot password API endpoints.

Not implemented yet:

- Email delivery for forgot password.
- Refresh token rotation/revocation storage.

Public endpoints:

- `GET /health`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`

Protected endpoints:

- `/clients`, `/cases`, `/payments`, and `/finance/dashboard` require any active authenticated user.
- `/users` requires an active authenticated admin user.
- `GET /auth/me` requires a valid access token and returns the current active user.

RBAC rules:

- Active `admin`, `lawyer`, and `assistant` users can access operational modules.
- Only active `admin` users can list, create, update, or view internal users through `/users`.
- Invalid, missing, expired, refresh-token, or inactive-user access attempts return `401`.
- Authenticated users without the required role return `403`.

Forgot password rules:

- `POST /auth/forgot-password` always returns a generic success message, even when the email does not exist.
- Only active users receive a reset token.
- Until email delivery exists, non-production environments include `resetToken` in the response for local testing.
- Production responses do not expose reset tokens.
- Password reset tokens expire after 30 minutes and can only be used on `POST /auth/reset-password`.
- Reset passwords must be 8 to 128 characters.

## Environment

Set `JWT_SECRET` in `.env`:

```env
JWT_SECRET="replace-with-a-long-random-secret"
```

If `JWT_SECRET` is missing, auth endpoints return a server error because tokens cannot be signed or verified.

## Passwords

API callers send plain `password` only when creating or updating a user.

The API never stores the plain password. It hashes the password with PBKDF2 and saves the result in `User.passwordHash`.

Password rules:

- Minimum length: 8 characters.
- Maximum length: 128 characters.
- Password is optional on user create/update because the minimal user model can exist before auth is fully configured.

## Set A Password

Create a new user with a password:

```http
POST /users
Content-Type: application/json
```

```json
{
  "name": "Dra. Ana",
  "email": "ana@jurisflow.test",
  "role": "lawyer",
  "password": "password123"
}
```

The response does not include `passwordHash`.

## Change A Password

Update an existing user with a new password:

```http
PATCH /users/:id
Content-Type: application/json
```

```json
{
  "password": "new-password123"
}
```

The API hashes the new password and replaces `passwordHash`.

## Postman Flow

Assume the API is running at:

```txt
http://localhost:3333
```

### 1. Create Or Update A User Password

Create:

```http
POST http://localhost:3333/users
Content-Type: application/json
```

```json
{
  "name": "Dra. Ana",
  "email": "ana@jurisflow.test",
  "role": "lawyer",
  "password": "password123"
}
```

Or update an existing user:

```http
PATCH http://localhost:3333/users/<user-id>
Content-Type: application/json
```

```json
{
  "password": "password123"
}
```

### 2. Login

```http
POST http://localhost:3333/auth/login
Content-Type: application/json
```

```json
{
  "email": "ana@jurisflow.test",
  "password": "password123"
}
```

Success response:

```json
{
  "user": {
    "id": "<user-id>",
    "name": "Dra. Ana",
    "email": "ana@jurisflow.test",
    "role": "lawyer",
    "status": "active",
    "createdAt": "...",
    "updatedAt": "..."
  },
  "accessToken": "<jwt-access-token>",
  "refreshToken": "<jwt-refresh-token>",
  "tokenType": "Bearer",
  "expiresIn": 900
}
```

### 3. Call `/auth/me`

In Postman, set Authorization:

```txt
Type: Bearer Token
Token: <accessToken>
```

Request:

```http
GET http://localhost:3333/auth/me
Authorization: Bearer <accessToken>
```

### 4. Refresh Tokens

```http
POST http://localhost:3333/auth/refresh
Content-Type: application/json
```

```json
{
  "refreshToken": "<refreshToken>"
}
```

The response has a new `accessToken` and `refreshToken`.

## Token Lifetime

- Access token: 15 minutes.
- Refresh token: 7 days.

Refresh tokens are currently stateless JWTs. That means the API can validate them without a database lookup except for checking that the user still exists and is active. Token revocation/logout persistence is not implemented yet.

## Under The Hood

### Password Hashing

Password hashing lives in:

```txt
apps/api/src/shared/security/password.ts
```

Flow:

1. User sends `password`.
2. API generates a random salt.
3. API runs PBKDF2-SHA256 with 120,000 iterations.
4. API stores a string containing algorithm, iterations, salt, and hash.
5. Login verifies with `timingSafeEqual`.

The stored format is:

```txt
pbkdf2_sha256$<iterations>$<salt>$<hash>
```

### JWT Signing

JWT helpers live in:

```txt
apps/api/src/shared/security/jwt.ts
```

Flow:

1. API creates a JWT header with `HS256`.
2. API creates a payload with user id, email, role, token type, `iat`, and `exp`.
3. API signs `header.payload` with HMAC-SHA256 using `JWT_SECRET`.
4. API verifies signatures using `timingSafeEqual`.

Access token payload has:

```json
{
  "sub": "<user-id>",
  "email": "ana@jurisflow.test",
  "role": "lawyer",
  "type": "access"
}
```

Refresh token payload is the same, except:

```json
{
  "type": "refresh"
}
```

### Frontend Flow

Frontend auth lives in:

```txt
apps/web/src/features/auth/
apps/web/src/services/auth.ts
apps/web/src/services/authStorage.ts
```

Flow:

1. Login page posts email/password to `/auth/login`.
2. The frontend stores `user`, `accessToken`, and `refreshToken` in `localStorage`.
3. Protected routes require a stored session.
4. The HTTP helper attaches `Authorization: Bearer <accessToken>`.
5. On `401`, the HTTP helper tries `/auth/refresh` once.
6. If refresh fails, the frontend clears auth storage and logs out.

## Common Errors

### `Invalid email or password`

Causes:

- Email does not exist.
- Password is wrong.
- User has no password set.
- User status is inactive.

### `Invalid token`

Causes:

- Missing `Authorization` header.
- Token is not a Bearer token.
- Token signature is invalid.
- Token expired.
- Refresh endpoint received an access token.
- User no longer exists or is inactive.

### `JWT_SECRET is required`

Cause:

- `JWT_SECRET` is missing from `.env`.
