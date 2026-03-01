# AI Village Medic - React Frontend

A web-based healthcare assistance platform for rural communities built with React.js.

## Project Structure

```
frontend/
├── public/                 # Static assets
├── src/
│   ├── components/        # Reusable components
│   ├── pages/            # Page components (Landing, Login, Register, Dashboards)
│   ├── context/          # React Context (Auth, global state)
│   ├── utils/            # Utility functions (API, helpers)
│   ├── styles/           # Global styles and Tailwind
│   ├── App.jsx           # Main app component with routing
│   └── main.jsx          # React entry point
├── index.html            # HTML template
├── vite.config.js        # Vite configuration
├── tailwind.config.js    # Tailwind CSS configuration
├── postcss.config.js     # PostCSS configuration
├── package.json          # Dependencies and scripts
└── .gitignore           # Git ignore rules
```

## Features

### 🔐 Authentication System
- **Landing Page**: Introduces the platform with Login/Register options
- **Role-based Registration**: Four roles supported
  - Rural Medical Worker
  - Medical Expert
  - Health Authority
  - System Administrator
- **Login Page**: Email/Patient ID + Password authentication
- **Protected Routes**: Role-based access control

### 📊 Role-specific Dashboards
1. **Patient Dashboard**: View health records, consultations, medications, follow-ups
2. **Medical Expert Dashboard**: Review and validate AI assessments
3. **Health Authority Dashboard**: Monitor disease patterns and trends
4. **Admin Dashboard**: User management, system performance monitoring

### 🏗️ Architecture
- **React Router v6**: Client-side routing
- **Context API**: State management for authentication
- **Axios**: HTTP client for API calls
- **Tailwind CSS**: Utility-first styling

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Environment Setup
```bash
# Create .env file from example
cp .env.example .env

# Edit .env with your API URL
```

### 3. Start Development Server
```bash
npm run dev
```
The app will open at `http://localhost:3000`

### 4. Build for Production
```bash
npm run build
```

This creates a `dist/` folder ready for deployment.

## Key Components

### Authentication Context (`src/context/AuthContext.jsx`)
Manages user authentication state with localStorage persistence:
- `useAuth()` hook for accessing auth state in components
- `login()` and `logout()` functions
- Automatic persistent login across sessions

### API Client (`src/utils/api.js`)
Axios instance with:
- Base URL configuration from environment
- Automatic token injection in requests
- Error handling interceptors

### Protected Routes (`src/App.jsx`)
`<ProtectedRoute>` component ensures:
- Only authenticated users can access dashboards
- Role-based access control
- Automatic redirection to login if unauthorized

## API Endpoints (To be implemented)

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/logout` - User logout

### Patient
- `GET /patients/:id` - Get patient details
- `GET /patients/:id/consultations` - Get consultation history
- `GET /patients/:id/risk-assessment` - Get latest risk assessment

### Medical Expert
- `GET /cases/pending` - Get pending review cases
- `PUT /cases/:id/validate` - Validate and update assessment

### Health Authority
- `GET /analytics/cases` - Get case statistics
- `GET /analytics/diseases` - Get disease distribution

### Admin
- `GET /users` - Get all users
- `POST /users` - Create new user
- `DELETE /users/:id` - Delete user

## Technology Stack

- **React 18** - UI framework
- **React Router v6** - Client-side routing
- **Axios** - HTTP client
- **Tailwind CSS** - Styling
- **Vite** - Build tool

## Next Steps

1. Create backend API with Node.js/Express
2. Implement real API endpoints
3. Add database integration (MongoDB/PostgreSQL)
4. Add voice input component for symptom recording
5. Implement AI risk assessment integration
6. Add notification system
7. Enhance UI/UX with more components
8. Add internationalization (Bangla support)

## License

Proprietary
