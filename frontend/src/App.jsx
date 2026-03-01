import { useState, createContext, useContext, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import PatientDashboard from './pages/PatientDashboard'
import RuralMedicalWorkerDashboard from './pages/RuralMedicalWorkerDashboard'
import MedicalExpertDashboard from './pages/MedicalExpertDashboard'
import HealthAuthorityDashboard from './pages/HealthAuthorityDashboard'
import AdminDashboard from './pages/AdminDashboard'

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />
  }

  return children
}

function AppRoutes() {
  const { isAuthenticated, user } = useAuth()

  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <Navigate to={`/${user.role}`} /> : <LandingPage />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to={`/${user.role}`} /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to={`/${user.role}`} /> : <RegisterPage />} />

      {/* Patient Routes */}
      <Route
        path="/patient"
        element={
          <ProtectedRoute requiredRole="patient">
            <PatientDashboard />
          </ProtectedRoute>
        }
      />

      {/* Rural Medical Worker Routes */}
      <Route
        path="/rural-medical-worker"
        element={
          <ProtectedRoute requiredRole="rural-medical-worker">
            <RuralMedicalWorkerDashboard />
          </ProtectedRoute>
        }
      />

      {/* Medical Expert Routes */}
      <Route
        path="/medical-expert"
        element={
          <ProtectedRoute requiredRole="medical-expert">
            <MedicalExpertDashboard />
          </ProtectedRoute>
        }
      />

      {/* Health Authority Routes */}
      <Route
        path="/health-authority"
        element={
          <ProtectedRoute requiredRole="health-authority">
            <HealthAuthorityDashboard />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  )
}

export default App
