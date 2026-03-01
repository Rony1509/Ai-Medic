import express from 'express'
import {
  registerUser,
  loginUser,
  registerPatient,
  loginPatient,
} from '../controllers/authController.js'

const router = express.Router()

// Authorized Personnel Routes
router.post('/register', registerUser)
router.post('/login', loginUser)

// Patient Routes
router.post('/patient/register', registerPatient)
router.post('/patient/login', loginPatient)

export default router
