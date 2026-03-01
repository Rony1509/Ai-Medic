import express from 'express'
import { getPatientsByUser, getAllPatients } from '../controllers/patientController.js'
import { authMiddleware, roleMiddleware } from '../middleware/auth.js'

const router = express.Router()

// All patient routes require authentication
router.use(authMiddleware)

// Get patients registered by the current user (RMW)
router.get('/my-patients', roleMiddleware(['rural-medical-worker']), getPatientsByUser)

// Get all patients - accessible by admin, medical-expert, health-authority
// and also rural-medical-worker to get their own registered patients
router.get('/', roleMiddleware(['admin', 'medical-expert', 'health-authority', 'rural-medical-worker']), getPatientsByUser)

export default router

