import express from 'express'
import {
  getAllUsers,
  approveUser,
  rejectUser,
  getSystemStats
} from '../controllers/adminController.js'
import { authMiddleware, roleMiddleware } from '../middleware/auth.js'

const router = express.Router()

// All admin routes require authentication and admin role
router.use(authMiddleware)
router.use(roleMiddleware(['admin']))

// 1. Get All Users - GET /api/admin/users
router.get('/users', getAllUsers)

// 2. Approve User - PUT /api/admin/users/:id/approve
router.put('/users/:id/approve', approveUser)

// 3. Reject User (Delete) - DELETE /api/admin/users/:id
router.delete('/users/:id', rejectUser)

// 4. Get System Stats - GET /api/admin/stats
router.get('/stats', getSystemStats)

export default router

