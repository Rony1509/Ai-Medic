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

export default function MedicalExpertDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('pending')
  const [pendingConsultations, setPendingConsultations] = useState([])
  const [reviewedConsultations, setReviewedConsultations] = useState([])
  const [selectedConsultation, setSelectedConsultation] = useState(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Form state
  const [reviewForm, setReviewForm] = useState({
    expertReview: '',
    updatedRiskLevel: '',
    medications: '',
    followUpInstructions: '',
    followUpDate: ''
  })

  // Load consultations on component mount
  useEffect(() => {
    loadConsultations()
  }, [])

  // Load pending and reviewed consultations
  const loadConsultations = async () => {
    try {
      setIsLoading(true)
      
      // Load pending consultations
      const pendingResponse = await api.get('/consultations/pending')
      const pendingData = pendingResponse.data.consultations || []
      setPendingConsultations(pendingData.map(transformConsultation))

      // Load all consultations (to get reviewed ones)
      const allResponse = await api.get('/consultations?status=Reviewed')
      const reviewedData = allResponse.data.consultations || []
      setReviewedConsultations(reviewedData.map(transformConsultation))
    } catch (error) {
      console.error('Error loading consultations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Transform consultation data
  const transformConsultation = (c) => ({
    id: c._id,
    consultationId: c.consultationId,
    patientId: c.patientId?._id,
    patientName: c.patientId?.name,
    patientAge: c.patientId?.age,
    patientGender: c.patientId?.gender,
    patientContact: c.patientId?.contact,
    date: new Date(c.consultationDate).toLocaleDateString(),
    symptoms: c.symptoms,
    temperature: c.temperature,
    bloodPressure: c.bloodPressure?.systolic 
      ? `${c.bloodPressure.systolic}/${c.bloodPressure.diastolic}` 
      : 'N/A',
    riskLevel: c.riskLevel,
    aiRecommendation: c.aiRecommendation,
    expertReview: c.expertReview,
    expertId: c.expertId,
    status: c.status,
    recordedBy: c.recordedBy
  })

  // Open review modal
  const handleReviewClick = (consultation) => {
    setSelectedConsultation(consultation)
    setReviewForm({
      expertReview: '',
      updatedRiskLevel: consultation.riskLevel,
      medications: '',
      followUpInstructions: '',
      followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    })
    setShowReviewModal(true)
  }

  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setReviewForm(prev => ({ ...prev, [name]: value }))
  }

  // Submit review
  const handleSubmitReview = async (e) => {
    e.preventDefault()
    
    if (!selectedConsultation) return

    try {
      const medicationsList = reviewForm.medications
        .split('\n')
        .filter(m => m.trim())
        .map(m => ({ name: m.trim(), dosage: '', frequency: '', duration: '' }))

      const response = await api.put(`/consultations/${selectedConsultation.id}`, {
        expertReview: reviewForm.expertReview,
        updatedRiskLevel: reviewForm.updatedRiskLevel,
        medications: medicationsList.length > 0 ? medicationsList : undefined,
        followUpInstructions: reviewForm.followUpInstructions || undefined
      })

      alert('Consultation reviewed successfully!')
      
      // Close modal and refresh
      setShowReviewModal(false)
      setSelectedConsultation(null)
      await loadConsultations()
      
      // Switch to reviewed tab
      setActiveTab('reviewed')
    } catch (error) {
      alert(error.response?.data?.message || 'Error submitting review')
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Medical Expert Dashboard</h1>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition duration-300"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pending'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pending Reviews ({pendingConsultations.length})
            </button>
            <button
              onClick={() => setActiveTab('reviewed')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'reviewed'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Reviewed Cases ({reviewedConsultations.length})
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading consultations...</p>
          </div>
        ) : (
          <>
            {/* Pending Reviews Tab */}
            {activeTab === 'pending' && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Pending Consultations</h2>
                  <p className="text-sm text-gray-600 mt-1">Review and provide expert notes for consultations</p>
                </div>
                
                {pendingConsultations.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No pending consultations to review</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Patient Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Symptoms
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Temp
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            BP
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            AI Risk
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            AI Recommendation
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {pendingConsultations.map((consultation) => (
                          <tr key={consultation.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {consultation.patientName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {consultation.date}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={consultation.symptoms}>
                              {consultation.symptoms?.substring(0, 50)}...
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {consultation.temperature || 'N/A'}°C
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {consultation.bloodPressure}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                consultation.riskLevel === 'High' ? 'bg-red-100 text-red-800' :
                                consultation.riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {consultation.riskLevel}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={consultation.aiRecommendation}>
                              {consultation.aiRecommendation?.substring(0, 60)}...
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => handleReviewClick(consultation)}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-300 text-sm"
                              >
                                Review
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Reviewed Cases Tab */}
            {activeTab === 'reviewed' && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Reviewed Cases</h2>
                  <p className="text-sm text-gray-600 mt-1">Previously reviewed consultations</p>
                </div>
                
                {reviewedConsultations.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No reviewed cases yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Patient Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Symptoms
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            AI Risk
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Final Risk
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Expert Review
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reviewedConsultations.map((consultation) => (
                          <tr key={consultation.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {consultation.patientName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {consultation.date}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={consultation.symptoms}>
                              {consultation.symptoms?.substring(0, 40)}...
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded text-xs ${
                                consultation.riskLevel === 'High' ? 'bg-red-100 text-red-800' :
                                consultation.riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {consultation.riskLevel}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded text-xs ${
                                consultation.riskLevel === 'High' ? 'bg-red-100 text-red-800' :
                                consultation.riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {consultation.riskLevel}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={consultation.expertReview}>
                              {consultation.expertReview || 'No notes'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                {consultation.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Review Modal */}
      {showReviewModal && selectedConsultation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Review Consultation</h2>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="p-6 space-y-6">
              {/* Patient Details */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Patient Details</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <p className="font-medium">{selectedConsultation.patientName}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Age:</span>
                    <p className="font-medium">{selectedConsultation.patientAge}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Gender:</span>
                    <p className="font-medium">{selectedConsultation.patientGender}</p>
                  </div>
                </div>
              </div>

              {/* Symptoms & Vitals */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Symptoms</label>
                  <div className="bg-gray-50 rounded p-3 text-sm text-gray-700 max-h-32 overflow-y-auto">
                    {selectedConsultation.symptoms || 'No symptoms recorded'}
                  </div>
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Vitals</label>
                  <div className="bg-gray-50 rounded p-3 text-sm text-gray-700">
                    <p>Temperature: {selectedConsultation.temperature || 'N/A'}°C</p>
                    <p>Blood Pressure: {selectedConsultation.bloodPressure}</p>
                  </div>
                </div>
              </div>

              {/* AI Recommendation */}
              <div>
                <label className="block text-gray-700 font-semibold mb-2">AI Recommendation</label>
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-gray-700">
                  {selectedConsultation.aiRecommendation || 'No AI recommendation'}
                </div>
              </div>

              {/* Expert Review Input */}
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Expert Review / Notes</label>
                <textarea
                  name="expertReview"
                  value={reviewForm.expertReview}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Enter your expert review and notes..."
                ></textarea>
              </div>

              {/* Updated Risk Level */}
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Updated Risk Level</label>
                <select
                  name="updatedRiskLevel"
                  value={reviewForm.updatedRiskLevel}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              {/* Medications */}
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Medications (one per line)</label>
                <textarea
                  name="medications"
                  value={reviewForm.medications}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Paracetamol 500mg - 3 times a day&#10;Amoxicillin 250mg - 2 times a day"
                ></textarea>
              </div>

              {/* Follow-up Instructions */}
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Follow-up Instructions</label>
                <textarea
                  name="followUpInstructions"
                  value={reviewForm.followUpInstructions}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="2"
                  placeholder="Enter follow-up instructions..."
                ></textarea>
              </div>

              {/* Follow-up Date */}
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Follow-up Date</label>
                <input
                  type="date"
                  name="followUpDate"
                  value={reviewForm.followUpDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition duration-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300"
                >
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

