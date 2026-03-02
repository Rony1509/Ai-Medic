import { Patient, Consultation } from '../models/index.js'

// Get patients registered by the current user (RMW)
export const getPatientsByUser = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id

    // Find patients registered by this user
    const patients = await Patient.find({ registeredBy: userId }).select('-password')

    // Get consultation counts for each patient
    const patientsWithCounts = await Promise.all(
      patients.map(async (patient) => {
        const consultationCount = await Consultation.countDocuments({ patientId: patient._id })
        return {
          id: patient.patientId,
          _id: patient._id,
          patientId: patient.patientId,
          name: patient.name,
          age: patient.age,
          gender: patient.gender,
          contact: patient.contact,
          identificationId: patient.identificationId,
          identificationType: patient.identificationType,
          createdAt: patient.createdAt,
          consultationCount
        }
      })
    )

    return res.status(200).json({
      message: 'Patients retrieved successfully',
      count: patientsWithCounts.length,
      patients: patientsWithCounts
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

// Get all patients (admin, medical-expert, health-authority)
export const getAllPatients = async (req, res) => {
  try {
    const patients = await Patient.find().select('-password')

    // Get consultation counts for each patient
    const patientsWithCounts = await Promise.all(
      patients.map(async (patient) => {
        const consultationCount = await Consultation.countDocuments({ patientId: patient._id })
        return {
          id: patient.patientId,
          _id: patient._id,
          patientId: patient.patientId,
          name: patient.name,
          age: patient.age,
          gender: patient.gender,
          contact: patient.contact,
          identificationId: patient.identificationId,
          identificationType: patient.identificationType,
          registeredBy: patient.registeredBy,
          createdAt: patient.createdAt,
          consultationCount
        }
      })
    )

    return res.status(200).json({
      message: 'All patients retrieved successfully',
      count: patientsWithCounts.length,
      patients: patientsWithCounts
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

