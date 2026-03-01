import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import config from './config.js'
import authRoutes from './routes/auth.js'
import consultationRoutes from './routes/consultations.js'
import adminRoutes from './routes/admin.js'
import analyticsRoutes from './routes/analytics.js'
import patientsRoutes from './routes/patients.js'

const app = express()

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoUri)
    console.log('✅ MongoDB Connected Successfully')
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message)
    process.exit(1)
  }
}

// Call connectDB before starting the server
connectDB()

// Middleware
// CORS configuration for multiple frontend ports (dev mode)
const corsOptions = {
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://localhost:3004',
      'http://localhost:3005',
    ]
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
}
app.use(cors(corsOptions))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
  next()
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/consultations', consultationRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/patients', patientsRoutes)

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint not found' })
})

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message)
  res.status(500).json({ message: 'Internal server error' })
})

// Start server
const PORT = config.port
app.listen(PORT, () => {
  console.log(`\n🚀 AI Village Medic Backend`)
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Environment: ${config.nodeEnv}`)
  console.log(`CORS Origin: ${config.corsOrigin}\n`)
})

export default app
