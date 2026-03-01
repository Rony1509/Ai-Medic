import mongoose from 'mongoose'
import User from './User.js'
import Patient from './Patient.js'
import Consultation from './Consultation.js'

export { User, Patient, Consultation }

// Export model functions for backward compatibility with controllers
export const createUser = async (userData) => {
  const user = new User(userData)
  return user.save()
}

export const findUserByEmail = async (email) => {
  return User.findOne({ email: email.toLowerCase() })
}

export const findUserById = async (id) => {
  return User.findById(id)
}

export const createPatient = async (patientData) => {
  const patient = new Patient(patientData)
  return patient.save()
}

export const findPatientById = async (patientId) => {
  // If patientId starts with "P-", search by patientId string field
  if (patientId && patientId.startsWith('P-')) {
    return await Patient.findOne({ patientId })
  }
  // Otherwise try MongoDB ObjectId
  try {
    if (mongoose.Types.ObjectId.isValid(patientId)) {
      return await Patient.findById(patientId)
    }
  } catch (error) {
    return null
  }
  return null
}

export const findPatientByIdentification = async (id, type) => {
  return Patient.findOne({ identificationId: id, identificationType: type })
}

export const getAllUsers = async () => {
  return User.find()
}

export const getAllPatients = async () => {
  return Patient.find()
}

