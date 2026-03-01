# AI Village Medic - Node.js Backend

Express API for AI Village Medic healthcare platform with authentication and role-based access control.

## Project Structure

```
backend/
├── src/
│   ├── controllers/     # Business logic for routes
│   ├── models/         # Data models and database operations
│   ├── routes/         # API route definitions
│   ├── middleware/     # Authentication and custom middleware
│   ├── utils/          # Helper functions (JWT, password hashing)
│   ├── config.js       # Configuration management
│   └── server.js       # Main server entry point
├── .env                # Environment variables
├── .env.example        # Example environment file
├── package.json        # Dependencies and scripts
└── README.md          # This file
```

## Features

### ✅ Authentication System
- User registration with email validation (@gmail.com, @health.gov.bd)
- Secure password hashing with bcryptjs
- JWT token-based authentication
- Role-based access control
- Patient ID generation
- Admin approval system for authorized personnel

### 🔐 Two Authentication Flows

**1. Authorized Personnel (Rural Medical Workers, Experts, Authorities, Admins)**
- Register with official email
- Login with email + password
- Requires admin approval before first login
- JWT token generation

**2. Patients**
- Registered by rural medical workers
- Auto-generated Patient ID and temporary password
- Login with Patient ID + password
- Separate authentication flow

### 📊 API Endpoints

#### Authentication
- `POST /api/auth/register` - Register authorized personnel
- `POST /api/auth/login` - Login authorized personnel
- `POST /api/auth/patient/register` - Register new patient (by medical worker)
- `POST /api/auth/patient/login` - Patient login

#### Health Check
- `GET /api/health` - Server health status

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Environment Setup
```bash
# Copy example env file
cp .env.example .env

# Edit .env with your configuration
```

### 3. Run Development Server
```bash
npm run dev
```
Server will start on `http://localhost:5000`

### 4. Run Production Server
```bash
npm start
```

## API Examples

### Register Authorized Personnel
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@health.gov.bd",
    "password": "secure123",
    "fullName": "Dr. Ahmed Khan",
    "role": "medical-expert"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@health.gov.bd",
    "password": "secure123"
  }'
```

### Register Patient
```bash
curl -X POST http://localhost:5000/api/auth/patient/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Fatima Ahmed",
    "age": 35,
    "gender": "Female",
    "contact": "01700000000",
    "identificationId": "1234567890",
    "identificationType": "National ID"
  }'
```

## Technology Stack

- **Express** - Web framework
- **JWT** - Token-based authentication
- **bcryptjs** - Password hashing
- **Cors** - Cross-origin requests
- **Dotenv** - Environment configuration
- **Joi** - Data validation (to be implemented)
- **Mongoose** - MongoDB integration (for production)

## Response Format

All responses follow a standard format:

### Success Response
```json
{
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "message": "Error description"
}
```

## Authentication

Include JWT token in request header:
```
Authorization: Bearer <token>
```

## Next Steps

1. Integrate MongoDB for persistent storage
2. Add Joi validation schemas
3. Implement patient password validation
4. Create patient consultation endpoints
5. Implement AI risk assessment integration
6. Add notification system
7. Implement follow-up management
8. Create analytics endpoints

## Security Considerations

- ✅ Passwords are hashed with bcryptjs
- ✅ JWT tokens with expiration
- ✅ CORS enabled for frontend
- ✅ Email format validation
- ⚠️ TODO: Add rate limiting
- ⚠️ TODO: Add input sanitization
- ⚠️ TODO: Add helmet for security headers
- ⚠️ TODO: Implement MongoDB for production

## License

Proprietary
