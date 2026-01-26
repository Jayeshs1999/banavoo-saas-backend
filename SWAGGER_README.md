# BookShop API Documentation

This project includes comprehensive Swagger documentation for all API endpoints.

## Swagger UI Access

Once your server is running, you can access the interactive API documentation at:

- **Development**: http://localhost:5000/api-docs
- **Production**: https://your-render-deployment-url.onrender.com/api-docs

## API Endpoints

### Products

- `GET /api/products` - Get all products with pagination and search
- `POST /api/products` - Create a new product (Admin only)
- `GET /api/products/top` - Get top-rated products
- `GET /api/products/:id` - Get product by ID
- `PUT /api/products/:id` - Update product (Admin only)
- `DELETE /api/products/:id` - Delete product (Admin only)
- `POST /api/products/:id/reviews` - Create product review

### Users

- `POST /api/users` - Register a new user
- `GET /api/users` - Get all users (Admin only)
- `POST /api/users/login` - Authenticate user
- `POST /api/users/logout` - Logout user
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/:id` - Get user by ID (Admin only)
- `PUT /api/users/:id` - Update user (Admin only)
- `DELETE /api/users/:id` - Delete user (Admin only)

### Orders

- `POST /api/orders` - Create new order
- `GET /api/orders` - Get all orders (Admin only)
- `GET /api/orders/mine` - Get logged-in user's orders
- `GET /api/orders/:id` - Get order by ID
- `PUT /api/orders/:id/pay` - Update order to paid
- `PUT /api/orders/:id/deliver` - Update order to delivered (Admin only)

### Upload

- `POST /api/upload` - Upload image files

## Authentication

Most endpoints require authentication using JWT tokens. To authenticate:

1. Login using `POST /api/users/login` with your credentials
2. Copy the JWT token from the response
3. Click the "Authorize" button in Swagger UI
4. Enter `Bearer <your-token>` in the authorization field

## Admin Endpoints

Admin-only endpoints are marked with 🔒 Admin in the documentation. To access these:

1. Login as an admin user
2. Use the JWT token for authentication

## Testing the API

You can test all endpoints directly from the Swagger UI:

1. Navigate to http://localhost:5000/api-docs
2. Click on any endpoint to expand its details
3. Use the "Try it out" button to test the endpoint
4. Fill in required parameters and click "Execute"

## Production Deployment

When deploying to Render.com:

1. Update the production server URL in `backend/swagger.js`:

   ```javascript
   url: "https://your-app-name.onrender.com/api";
   ```

2. The Swagger documentation will be available at:
   ```
   https://your-app-name.onrender.com/api-docs
   ```

## Dependencies

The following packages are used for Swagger documentation:

- `swagger-jsdoc` - Generates OpenAPI specification from JSDoc comments
- `swagger-ui-express` - Serves the interactive Swagger UI

## File Structure

```
backend/
├── swagger.js              # Swagger configuration and schemas
├── server.js              # Main server with Swagger UI setup
└── routes/
    ├── productRoute.js    # Product endpoints with JSDoc
    ├── userRoute.js       # User endpoints with JSDoc
    ├── orderRoute.js      # Order endpoints with JSDoc
    └── uploadRoutes.js    # Upload endpoints with JSDoc
```

## Features

- ✅ Interactive API documentation
- ✅ Request/response examples
- ✅ Authentication support
- ✅ Parameter validation
- ✅ Pagination support
- ✅ Search functionality
- ✅ Admin role protection
- ✅ File upload support
