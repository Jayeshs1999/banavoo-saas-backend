# Swagger API Testing Guide

## Authentication Required

All PG routes (`/api/pgs/*`) require admin authentication. To test these APIs in Swagger UI, you must first:

### 1. Get an Admin Token

**Option A: Register a new admin**

- Go to `/api/admins/register` in Swagger UI
- Fill in the required fields (pgName, ownerName, email, mobile, password, address)
- This will return a JWT token

**Option B: Login with existing admin**

- Go to `/api/admins/auth` in Swagger UI
- Provide your admin email and password
- This will return a JWT token

### 2. Set Authentication in Swagger UI

1. Click the "Authorize" button (usually in the top right corner of Swagger UI)
2. Enter your JWT token in the format: `Bearer your_token_here`
3. Click "Authorize" to apply

### 3. Test PG APIs

Now you can test any PG API endpoint:

- `/api/pgs` (GET, POST)
- `/api/pgs/{id}` (GET, PUT, DELETE)
- `/api/pgs/admin` (GET)
- `/api/pgs/search` (GET)

## Example Admin Registration

```json
{
  "pgName": "Sample PG",
  "ownerName": "John Doe",
  "email": "admin@example.com",
  "mobile": "1234567890",
  "password": "password123",
  "address": {
    "area": "Downtown",
    "landmark": "Near Station",
    "city": "Mumbai",
    "pincode": "400001",
    "state": "Maharashtra"
  }
}
```

## Example Login

```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

## Token Format

After successful registration or login, you'll receive a response like:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Use this token in the Authorization header as: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## Troubleshooting

- **401 Error**: Make sure you've set the Authorization header with a valid JWT token
- **404 Error**: Check if the admin exists or if the PG ID is correct
- **400 Error**: Verify that all required fields are provided and in the correct format

## Development Notes

- Tokens are valid for 30 days
- Tokens can be passed via cookies or Authorization header
- Admin routes require admin privileges
- PG routes require admin authentication
