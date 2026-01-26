# Dormitory Management API

A comprehensive backend API for managing PG (Paying Guest) accommodations and dormitory management.

## Features

- **Admin Management**: Register, authenticate, and manage PG administrators
- **User Management**: User registration and authentication
- **PG Management**: Create and manage PG properties with room and bed allocation
- **Booking System**: Handle booking requests, approvals, and management
- **OTP Verification**: Mobile and email verification system
- **Password Reset**: Secure password reset functionality
- **File Upload**: Support for uploading PG photos
- **Swagger Documentation**: Complete API documentation

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM (Object Document Mapper)
- **JWT** - Authentication
- **Bcryptjs** - Password hashing
- **Multer** - File upload handling
- **Swagger** - API documentation

## Installation

1. Clone the repository

```bash
git clone <repository-url>
cd bookshop
```

2. Install dependencies

```bash
npm install
```

3. Set up environment variables

```bash
cp example.env .env
# Edit .env file with your configuration
```

4. Start the development server

```bash
npm run dev
```

## API Endpoints

### Admin Routes

#### Authentication

- `POST /api/admins/auth` - Admin login
- `POST /api/admins/register` - Admin registration
- `POST /api/admins/logout` - Admin logout

#### Profile Management

- `GET /api/admins/profile` - Get admin profile
- `PUT /api/admins/profile` - Update admin profile

#### OTP & Verification

- `POST /api/admins/send-mobile-otp` - Send mobile OTP
- `POST /api/admins/verify-mobile-otp` - Verify mobile OTP
- `POST /api/admins/send-email-otp` - Send email OTP
- `POST /api/admins/verify-email-otp` - Verify email OTP

#### Password Management

- `POST /api/admins/forgot-password` - Request password reset
- `POST /api/admins/reset-password` - Reset password

### User Routes

#### Authentication

- `POST /api/users/auth` - User login
- `POST /api/users/register` - User registration
- `POST /api/users/logout` - User logout

#### Profile Management

- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

### PG Routes

#### PG Management

- `GET /api/pgs` - Get all PGs
- `GET /api/pgs/:id` - Get PG by ID
- `POST /api/pgs` - Create new PG (Admin only)
- `PUT /api/pgs/:id` - Update PG (Admin only)
- `DELETE /api/pgs/:id` - Delete PG (Admin only)

#### PG Search

- `GET /api/pgs/search` - Search PGs by location

### Booking Routes

#### Booking Management

- `GET /api/bookings` - Get all bookings (Admin only)
- `GET /api/bookings/user` - Get user bookings
- `GET /api/bookings/pg` - Get PG bookings (Admin only)
- `POST /api/bookings` - Create new booking
- `PUT /api/bookings/:id` - Update booking status (Admin only)
- `DELETE /api/bookings/:id` - Cancel booking

### File Upload

#### Image Upload

- `POST /api/upload` - Upload PG images

## Database Models

### User

- Basic user information (name, email, mobile, address)
- Password hashing and verification
- OTP verification system

### Admin

- PG administrator information
- PG ownership and management
- Password hashing and verification
- OTP verification system

### PG

- PG property details (name, location, photos)
- Room and bed structure
- Online payment capability
- Bed allocation status

### Booking

- Booking details (user, PG, room, bed, dates)
- Booking status and payment information
- Price calculation and management

## Environment Variables

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/dormitory_management
JWT_SECRET=your_jwt_secret_key_here
```

## API Documentation

Access the interactive API documentation at:

```
http://localhost:5000/api-docs
```

## Development

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Building

```bash
npm run build
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for your changes
5. Run the test suite
6. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact:

- Email: support@example.com
- GitHub Issues: [Repository Issues](https://github.com/yourusername/dormitory-api/issues)
