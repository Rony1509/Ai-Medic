import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

// API helper function with auth header
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default function PatientDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [consultations, setConsultations] = useState([])
  const [patientData, setPatientData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch patient data and consultations on component mount
  useEffect(() => {
    loadPatientData()
  }, [])

  // Load patient consultations from backend
  const loadPatientData = async () => {
    try {
      setIsLoading(true)
      
      // Get patientId from auth context
      const patientId = user?.patientId
      if (!patientId) {
        console.error('No patientId found in auth context')
        return
      }

      // Fetch consultations for this patient
      const response = await api.get(`/consultations/patient/${patientId}`)
      
      const consultationsData = response.data.consultations || []
      setConsultations(consultationsData.map(c => ({
        id: c._id,
        consultationId: c.consultationId,
        date: new Date(c.consultationDate).toLocaleDateString(),
        symptoms: c.symptoms,
        temperature: c.temperature,
        bloodPressure: c.bloodPressure?.systolic 
          ? `${c.bloodPressure.systolic}/${c.bloodPressure.diastolic}` 
          : 'N/A',
        riskLevel: c.riskLevel,
        status: c.status,
        expertReview: c.expertReview,
        medications: c.medications || [],
        followUpInstructions: c.followUpInstructions || ''
      })))

      // Set patient data from response
      setPatientData({
        name: response.data.patientName,
        patientId: response.data.patientId
      })
    } catch (error) {
      console.error('Error loading patient data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  // Get the latest consultation (first one since sorted by date desc)
  const latestConsultation = consultations.length > 0 ? consultations[0] : null

  // Get risk level colors and messages
  const getRiskLevelStyle = (riskLevel) => {
    switch (riskLevel) {
      case 'High':
        return {
          bg: 'bg-red-100',
          text: 'text-red-800',
          border: 'border-red-300',
          message: 'Urgent attention required'
        }
      case 'Medium':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-800',
          border: 'border-yellow-300',
          message: 'Follow up with doctor'
        }
      case 'Low':
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          border: 'border-green-300',
          message: 'You are doing well'
        }
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          border: 'border-gray-300',
          message: 'Assessment pending'
        }
    }
  }

  const riskStyle = latestConsultation ? getRiskLevelStyle(latestConsultation.riskLevel) : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Patient Dashboard</h1>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition duration-300"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading your data...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Welcome Card */}
            <div className="col-span-full bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Welcome back, {user?.name || 'Patient'}!
              </h2>
              <p className="text-gray-600">Patient ID: {user?.patientId || 'N/A'}</p>
            </div>

            {/* Personal Details Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Personal Details</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium text-gray-700">Name:</span> {user?.name || 'N/A'}</p>
                <p><span className="font-medium text-gray-700">Patient ID:</span> {user?.patientId || 'N/A'}</p>
                <p><span className="font-medium text-gray-700">Age:</span> {user?.age || 'N/A'}</p>
                <p><span className="font-medium text-gray-700">Contact:</span> {user?.contact || 'N/A'}</p>
              </div>
            </div>

            {/* Health Status Card */}
            <div className={`rounded-lg shadow p-6 ${riskStyle ? riskStyle.bg : 'bg-white'}`}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">❤️ Health Status</h3>
              {latestConsultation ? (
                <div>
                  <div className={`inline-block px-4 py-2 rounded-full text-lg font-bold ${riskStyle.text}`}>
                    {latestConsultation.riskLevel} Risk
                  </div>
                  <p className={`mt-2 text-sm font-medium ${riskStyle.text}`}>
                    {riskStyle.message}
                  </p>
                  {latestConsultation.expertReview && (
                    <p className="mt-2 text-sm text-gray-600">
                      Latest review: {latestConsultation.expertReview.substring(0, 100)}...
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-600 text-sm">No recent assessments</p>
              )}
            </div>

            {/* Medications Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">💊 Medications</h3>
              {latestConsultation && latestConsultation.medications && latestConsultation.medications.length > 0 ? (
                <ul className="space-y-2">
                  {latestConsultation.medications.map((med, index) => (
                    <li key={index} className="text-sm text-gray-700 border-b pb-2">
                      <span className="font-medium">{med.name}</span>
                      {med.dosage && <span className="text-gray-500"> - {med.dosage}</span>}
                      {med.frequency && <span className="text-gray-500"> - {med.frequency}</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-600 text-sm">No prescribed medications</p>
              )}
            </div>

            {/* Follow-up Instructions Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📝 Follow-up Instructions</h3>
              {latestConsultation && latestConsultation.followUpInstructions ? (
                <p className="text-sm text-gray-700">{latestConsultation.followUpInstructions}</p>
              ) : (
                <p className="text-gray-600 text-sm">No pending follow-ups</p>
              )}
            </div>

            {/* Recent Consultations Card - Full Width */}
            <div className="col-span-full bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🏥 Recent Consultations</h3>
              {consultations.length === 0 ? (
                <p className="text-gray-600 text-sm">No consultations yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Date
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Symptoms
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Risk Level
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {consultations.slice(0, 5).map((consultation) => {
                        const style = getRiskLevelStyle(consultation.riskLevel)
                        return (
                          <tr key={consultation.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {consultation.date}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title={consultation.symptoms}>
                              {consultation.symptoms?.substring(0, 50)}...
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                                {consultation.riskLevel}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                consultation.status === 'Reviewed' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {consultation.status}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

