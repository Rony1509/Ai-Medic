import {
  createUser,
  findUserByEmail,
  findPatientById,
  createPatient,
  findPatientByIdentification,
} from '../models/index.js'
import { generateToken } from '../utils/jwt.js'

// Authorized Personnel Registration
export const registerUser = async (req, res) => {
  try {
    const { email, password, fullName, role } = req.body

    // Validation
    if (!email || !password || !fullName || !role) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    const validRoles = ['rural-medical-worker', 'medical-expert', 'health-authority', 'admin']
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' })
    }

    // Only allow @gmail.com and @health.gov.bd emails
    const emailRegex = /^[^\s@]+@(gmail\.com|health\.gov\.bd)$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: 'Email must be from Gmail or Health Government domain (@health.gov.bd)',
      })
    }

    // Check if user already exists
    const existingUser = await findUserByEmail(email)
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' })
    }

    // Create user (password will be hashed by Mongoose pre-save hook)
    // Note: isApproved defaults to false from the User model schema
    const user = await createUser({
      email,
      password,
      fullName,
      role,
      isApproved: false // Explicitly set to false for all new registrations
    })

    // Return response without password - user needs admin approval to login
    return res.status(201).json({
      message: 'Registration successful! Please wait for admin approval before logging in.',
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isApproved: user.isApproved,
      },
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

// User Login (Authorized Personnel)
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    // Find user
    const user = await findUserByEmail(email)
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    // Verify password using Mongoose method
    const passwordMatch = await user.comparePassword(password)
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    // Check if user is approved
    if (!user.isApproved) {
      return res.status(403).json({
        message: 'Your account is pending admin approval',
      })
    }

    // Generate token
    const token = generateToken(user._id.toString(), user.role)

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        name: user.fullName,
      },
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

// Patient Registration (by rural medical worker)
export const registerPatient = async (req, res) => {
  try {
    const { name, age, gender, contact, identificationId, identificationType, registeredBy } = req.body

    if (!name || !age || !gender || !identificationId || !identificationType) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    // Check if patient already exists with this identification
    const existingPatient = await findPatientByIdentification(identificationId, identificationType)
    if (existingPatient) {
      return res.status(400).json({
        message: 'Patient already registered with this identification',
      })
    }

    // Generate temporary password (will be hashed by Mongoose pre-save hook)
    const tempPassword = Math.random().toString(36).substring(2, 10).toUpperCase()

    // Create patient
    const patient = await createPatient({
      name,
      age,
      gender,
      contact,
      identificationId,
      identificationType,
      password: tempPassword,
      registeredBy,
    })

    return res.status(201).json({
      message: 'Patient registered successfully',
      patient: {
        patientId: patient.patientId,
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        contact: patient.contact,
      },
      credentials: {
        patientId: patient.patientId,
        password: tempPassword,
        note: 'Please provide these credentials to the patient securely',
      },
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

// Patient Login
export const loginPatient = async (req, res) => {
  try {
    const { patientId, password } = req.body

    if (!patientId || !password) {
      return res.status(400).json({ message: 'Patient ID and password are required' })
    }

    // Find patient by patientId string
    const patient = await findPatientById(patientId)
    if (!patient) {
      return res.status(401).json({ message: 'Invalid patient ID or password' })
    }

    // Verify password using Mongoose method
    const passwordMatch = await patient.comparePassword(password)
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid patient ID or password' })
    }

    // Generate token
    const token = generateToken(patient._id.toString(), 'patient')

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        patientId: patient.patientId,
        name: patient.name,
        age: patient.age,
        contact: patient.contact,
        role: 'patient',
      },
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}
