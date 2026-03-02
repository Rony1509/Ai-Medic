import dotenv from 'dotenv'
dotenv.config()

export const config = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-village-medic',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-here',
  jwtExpire: process.env.JWT_EXPIRE || '7d',
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  geminiApiKey: process.env.GEMINI_API_KEY || ''
}

export default config
