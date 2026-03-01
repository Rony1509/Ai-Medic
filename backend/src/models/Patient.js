import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

// Helper function to generate patient ID
const generatePatientId = () => {
  const randomNum = Math.floor(10000 + Math.random() * 90000) // 5 digit number
  return `P-${randomNum}`
}

const patientSchema = new mongoose.Schema({
  patientId: {
    type: String,
    unique: true,
    default: generatePatientId
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  age: {
    type: Number,
    required: true
  },
  gender: {
    type: String,
    required: true,
    enum: ['Male', 'Female', 'Other']
  },
  contact: {
    type: String,
    required: true,
    trim: true
  },
  identificationId: {
    type: String,
    required: true,
    trim: true
  },
  identificationType: {
    type: String,
    enum: ['National ID', 'Birth Certificate', 'Passport'],
    required: true
  },
  password: {
    type: String,
    required: true
  },
  registeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  consultations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Consultation'
  }],
  medications: [{
    name: String,
    dosage: String,
    frequency: String,
    duration: String,
    startDate: Date,
    endDate: Date
  }],
  followUps: [{
    date: Date,
    notes: String,
    status: {
      type: String,
      enum: ['Scheduled', 'Completed', 'Missed'],
      default: 'Scheduled'
    }
  }]
})

// Hash password before saving
patientSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  
  try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Compare password method
patientSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

// Remove password from JSON output
patientSchema.methods.toJSON = function() {
  const obj = this.toObject()
  delete obj.password
  return obj
}

const Patient = mongoose.model('Patient', patientSchema)

export default Patient

