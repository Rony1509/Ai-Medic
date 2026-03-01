import { Consultation, Patient } from '../models/index.js'

// AI Risk Assessment Keywords
const HIGH_RISK_KEYWORDS = [
  'chest pain', 'unconscious', 'severe bleeding', 'stroke', 'heart attack',
  'বুকে ব্যথা', 'অজ্ঞান', 'heart attack', 'difficulty breathing',
  'severe burn', 'poisoning', 'seizure'
]

const MEDIUM_RISK_KEYWORDS = [
  'fever', 'vomiting', 'diarrhea', 'infection', 'cough', 'cold',
  'জ্বর', 'বমি', 'ডায়রিয়া', 'flu', 'asthma', 'diabetes'
]

// AI Risk Assessment Function
const assessRisk = (symptoms, temperature) => {
  const symptomsLower = symptoms.toLowerCase()
  
  // Check HIGH RISK conditions
  if (temperature > 103 || HIGH_RISK_KEYWORDS.some(keyword => symptomsLower.includes(keyword))) {
    return {
      riskLevel: 'High',
      aiRecommendation: 'URGENT: Immediate referral to hospital required. Contact emergency services.'
    }
  }
  
  // Check MEDIUM RISK conditions
  if (temperature >= 100 || MEDIUM_RISK_KEYWORDS.some(keyword => symptomsLower.includes(keyword))) {
    return {
      riskLevel: 'Medium',
      aiRecommendation: 'Consult a doctor. Preliminary medication may be required. Follow up in 3 days.'
    }
  }
  
  // Default LOW RISK
  return {
    riskLevel: 'Low',
    aiRecommendation: 'Rest and home care advised. Stay hydrated. If symptoms worsen, visit health center.'
  }
}

// Generate consultation ID
const generateConsultationId = () => {
  const randomNum = Math.floor(100000 + Math.random() * 900000) // 6 digit number
  return `C-${randomNum}`
}

// 1. Create Consultation - POST /api/consultations
// Accessible by rural-medical-worker only
export const createConsultation = async (req, res) => {
  try {
    const { patientId, symptoms, temperature, bloodPressure, otherVitals, consultationDate, voiceInputText } = req.body

    // Validation
    if (!patientId || !symptoms) {
      return res.status(400).json({ message: 'Patient ID and symptoms are required' })
    }

    // Find patient by patientId string
    const patient = await Patient.findOne({ patientId })
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' })
    }

    // Run AI Risk Assessment
    const temp = temperature || 98.6
    const { riskLevel, aiRecommendation } = assessRisk(symptoms, temp)

    // Create consultation
    const consultation = new Consultation({
      consultationId: generateConsultationId(),
      patientId: patient._id,
      recordedBy: req.user.userId,
      symptoms,
      voiceInputText: voiceInputText || '',
      temperature: temp,
      bloodPressure: bloodPressure || { systolic: null, diastolic: null },
      otherVitals: otherVitals || {},
      consultationDate: consultationDate || new Date(),
      riskLevel,
      aiRecommendation,
      status: 'Pending Review'
    })

    await consultation.save()

    // Add consultation reference to patient
    patient.consultations.push(consultation._id)
    await patient.save()

    return res.status(201).json({
      message: 'Consultation created successfully',
      consultation: {
        id: consultation._id,
        consultationId: consultation.consultationId,
        patientId: patient.patientId,
        patientName: patient.name,
        symptoms: consultation.symptoms,
        temperature: consultation.temperature,
        bloodPressure: consultation.bloodPressure,
        riskLevel: consultation.riskLevel,
        aiRecommendation: consultation.aiRecommendation,
        status: consultation.status,
        consultationDate: consultation.consultationDate
      }
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

// 2. Get Consultations by Patient - GET /api/consultations/patient/:patientId
export const getConsultationsByPatient = async (req, res) => {
  try {
    const { patientId } = req.params

    // Find patient by patientId string
    const patient = await Patient.findOne({ patientId })
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' })
    }

    // Get consultations for this patient
    const consultations = await Consultation.find({ patientId: patient._id })
      .populate('recordedBy', 'fullName role')
      .populate('expertId', 'fullName role')
      .sort({ consultationDate: -1 })

    return res.status(200).json({
      patientId: patient.patientId,
      patientName: patient.name,
      consultations
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

// 3. Get Pending Consultations - GET /api/consultations/pending
// Only for medical-expert role
export const getPendingConsultations = async (req, res) => {
  try {
    const consultations = await Consultation.find({ status: 'Pending Review' })
      .populate('patientId', 'name age gender contact patientId')
      .populate('recordedBy', 'fullName role')
      .sort({ consultationDate: -1 })

    return res.status(200).json({
      count: consultations.length,
      consultations
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

// 4. Review Consultation - PUT /api/consultations/:id
// Only for medical-expert role
export const reviewConsultation = async (req, res) => {
  try {
    const { id } = req.params
    const { expertReview, updatedRiskLevel, medications, followUpInstructions } = req.body

    // Find consultation
    const consultation = await Consultation.findById(id)
    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found' })
    }

    // Check if already reviewed
    if (consultation.status !== 'Pending Review') {
      return res.status(400).json({ message: 'Consultation already reviewed' })
    }

    // Update consultation
    consultation.expertReview = expertReview || ''
    consultation.expertId = req.user.userId
    consultation.status = 'Reviewed'
    
    if (updatedRiskLevel) {
      consultation.riskLevel = updatedRiskLevel
    }

    await consultation.save()

    // Update patient medications and follow-ups if provided
    const patient = await Patient.findById(consultation.patientId)
    if (patient) {
      if (medications && medications.length > 0) {
        patient.medications = patient.medications.concat(medications)
      }
      
      if (followUpInstructions) {
        patient.followUps.push({
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
          notes: followUpInstructions,
          status: 'Scheduled'
        })
      }
      
      await patient.save()
    }

    return res.status(200).json({
      message: 'Consultation reviewed successfully',
      consultation: {
        id: consultation._id,
        consultationId: consultation.consultationId,
        riskLevel: consultation.riskLevel,
        expertReview: consultation.expertReview,
        status: consultation.status,
        reviewedBy: req.user.userId
      }
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

// Get all consultations (for admin/health-authority)
export const getAllConsultations = async (req, res) => {
  try {
    const { status, riskLevel, limit = 50 } = req.query
    
    const filter = {}
    if (status) filter.status = status
    if (riskLevel) filter.riskLevel = riskLevel

    const consultations = await Consultation.find(filter)
      .populate('patientId', 'name age gender contact patientId')
      .populate('recordedBy', 'fullName role')
      .populate('expertId', 'fullName role')
      .sort({ consultationDate: -1 })
      .limit(parseInt(limit))

    return res.status(200).json({
      count: consultations.length,
      consultations
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

// Get consultations recorded by current user (RMW)
export const getMyConsultations = async (req, res) => {
  try {
    const userId = req.user.userId

    const consultations = await Consultation.find({ recordedBy: userId })
      .populate('patientId', 'name age gender contact patientId')
      .populate('expertId', 'fullName role')
      .sort({ consultationDate: -1 })

    return res.status(200).json({
      count: consultations.length,
      consultations
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

