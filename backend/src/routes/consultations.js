import express from 'express'
import {
  createConsultation,
  getConsultationsByPatient,
  getPendingConsultations,
  reviewConsultation,
  getAllConsultations,
  getMyConsultations
} from '../controllers/consultationController.js'
import { authMiddleware, roleMiddleware } from '../middleware/auth.js'
import upload from '../middleware/upload.js'

const router = express.Router()

// All routes require authentication
router.use(authMiddleware)

// 1. Create Consultation - POST /api/consultations
// Accepts optional file upload (field name: 'document')
router.post('/', roleMiddleware(['rural-medical-worker']), upload.single('document'), createConsultation)

// 2. Get Consultations by Patient - GET /api/consultations/patient/:patientId
router.get('/patient/:patientId', getConsultationsByPatient)

// 3. Get Pending Consultations - GET /api/consultations/pending
// Only medical-expert can view pending consultations
router.get('/pending', roleMiddleware(['medical-expert']), getPendingConsultations)

// 4. Review Consultation - PUT /api/consultations/:id
// Only medical-expert can review
router.put('/:id', roleMiddleware(['medical-expert']), reviewConsultation)

// Get consultations recorded by current user (RMW)
router.get('/my-consultations', roleMiddleware(['rural-medical-worker']), getMyConsultations)

// Get all consultations - for admin/health-authority
router.get('/', roleMiddleware(['admin', 'health-authority', 'medical-expert']), getAllConsultations)

export default router

