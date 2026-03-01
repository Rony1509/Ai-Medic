import express from 'express'
import {
  getDiseaseStats,
  getCaseTrends,
  getGeographicData
} from '../controllers/analyticsController.js'
import { authMiddleware, roleMiddleware } from '../middleware/auth.js'

const router = express.Router()

// All analytics routes require authentication and admin or health-authority role
router.use(authMiddleware)
router.use(roleMiddleware(['admin', 'health-authority']))

// 1. Get Disease Stats - GET /api/analytics/diseases
router.get('/diseases', getDiseaseStats)

// 2. Get Case Trends - GET /api/analytics/trends
router.get('/trends', getCaseTrends)

// 3. Get Geographic Data (Overview) - GET /api/analytics/overview
router.get('/overview', getGeographicData)

export default router

