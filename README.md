# Backend — Express + MongoDB Template

A clean, minimal **Node.js + Express + MongoDB** API starter template.

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (ESM) |
| Framework | Express 4 |
| Database | MongoDB + Mongoose |
| Auth | JWT (cookie + Authorization header) |
| Password | bcryptjs |

## Project structure

```
backend/
  config/
    db.js                ← MongoDB connection

  middleware/
    asyncHandler.js      ← Async error wrapper
    authMiddleware.js    ← JWT protect + requireRole
    errorMiddleware.js   ← 404 / global error handler

  models/
    userModel.js         ← User schema (extend or duplicate)

  controllers/
    authController.js    ← register / login / logout / getMe

  routes/
    authRoutes.js        ← /api/auth/*

  utils/
    generateToken.js     ← Signs JWT + sets cookie

  server.js              ← App entry point
```

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp example.env .env
# → Fill in MONGO_URI and JWT_SECRET at minimum

# 3. Start dev server
npm run dev
```

## API endpoints (built-in)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Create account |
| POST | `/api/auth/login` | Public | Get JWT |
| POST | `/api/auth/logout` | Private | Clear cookie |
| GET | `/api/auth/me` | Private | Get current user |

## Adding a new resource

1. Create `models/yourModel.js` — define the Mongoose schema
2. Create `controllers/yourController.js` — implement handlers using `asyncHandler`
3. Create `routes/yourRoutes.js` — wire up the router
4. Mount in `server.js`:
   ```js
   import yourRoutes from "./routes/yourRoutes.js";
   app.use("/api/your-resource", yourRoutes);
   ```

## Role-based access

```js
import { protect, requireRole } from "../middleware/authMiddleware.js";

// Admin only
router.delete("/users/:id", protect, requireRole("admin"), deleteUser);
```
