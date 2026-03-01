import mongoose from 'mongoose'

// Helper function to generate consultation ID
const generateConsultationId = () => {
  const randomNum = Math.floor(100000 + Math.random() * 900000) // 6 digit number
  return `C-${randomNum}`
}

const consultationSchema = new mongoose.Schema({
  consultationId: {
    type: String,
    unique: true,
    default: generateConsultationId
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  symptoms: {
    type: String,
    default: ''
  },
  voiceInputText: {
    type: String,
    default: ''
  },
  temperature: {
    type: Number,
    default: null
  },
  bloodPressure: {
    systolic: {
      type: Number,
      default: null
    },
    diastolic: {
      type: Number,
      default: null
    }
  },
  otherVitals: {
    heartRate: Number,
    respiratoryRate: Number,
    oxygenSaturation: Number,
    weight: Number,
    height: Number
  },
  consultationDate: {
    type: Date,
    default: Date.now
  },
  riskLevel: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Pending'],
    default: 'Pending'
  },
  aiRecommendation: {
    type: String,
    default: ''
  },
  expertReview: {
    type: String,
    default: ''
  },
  expertId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['Pending Review', 'Reviewed', 'Escalated'],
    default: 'Pending Review'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

const Consultation = mongoose.model('Consultation', consultationSchema)

export default Consultation

