import { useState, useRef, useEffect } from 'react'
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

// Check if browser supports speech recognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
const isSpeechRecognitionSupported = !!SpeechRecognition

export default function RuralMedicalWorkerDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [showPatientModal, setShowPatientModal] = useState(false)
  const [patients, setPatients] = useState([])
  const [consultations, setConsultations] = useState([])
  const [isRecording, setIsRecording] = useState(false)
  const [voiceText, setVoiceText] = useState('')
  const [aiResult, setAiResult] = useState(null)
  const [showAiResultModal, setShowAiResultModal] = useState(false)
  const [speechError, setSpeechError] = useState('')
  const [uploadedFile, setUploadedFile] = useState(null)
  const [uploadedFilePreview, setUploadedFilePreview] = useState(null)
  const fileInputRef = useRef(null)

  // Handle document/image file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadedFile(file)
    // Generate preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (ev) => setUploadedFilePreview(ev.target.result)
      reader.readAsDataURL(file)
    } else {
      setUploadedFilePreview(null) // PDF — no preview
    }
  }

  const removeUploadedFile = () => {
    setUploadedFile(null)
    setUploadedFilePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }
  useEffect(() => {
    loadPatients()
    loadConsultations()
  }, [])

  // Load patients from backend
  const loadPatients = async () => {
    try {
      const response = await api.get('/patients')
      const patientsData = response.data.patients || []
      setPatients(patientsData.map(p => ({
        id: p.patientId,
        _id: p._id,
        patientId: p.patientId,
        name: p.name,
        age: p.age,
        gender: p.gender,
        contact: p.contact,
        identificationType: p.identificationType,
        identificationId: p.identificationId,
        registeredDate: new Date(p.createdAt).toLocaleDateString(),
        consultationCount: p.consultationCount || 0
      })))
    } catch (error) {
      console.error('Error loading patients:', error)
    }
  }

  // Load consultations from backend
  const loadConsultations = async () => {
    try {
      const response = await api.get('/consultations/my-consultations')
      const consultationsData = response.data.consultations || []
      setConsultations(consultationsData.map(c => ({
        id: c.consultationId,
        _id: c._id,
        patientId: c.patientId?.patientId,
        patientName: c.patientId?.name,
        date: new Date(c.consultationDate).toLocaleDateString(),
        symptoms: c.symptoms,
        temperature: c.temperature,
        bloodPressure: c.bloodPressure?.systolic ? `${c.bloodPressure.systolic}/${c.bloodPressure.diastolic}` : null,
        riskLevel: c.riskLevel,
        aiRecommendation: c.aiRecommendation,
        status: c.status,
        recordedAt: new Date(c.createdAt).toLocaleString()
      })))
    } catch (error) {
      console.error('Error loading consultations:', error)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  // Handle Quick Action Buttons
  const handleRegisterPatient = () => {
    setShowPatientModal(true)
  }

  const handleRecordConsultation = () => {
    setActiveTab('consultation')
  }

  const handleViewPatients = () => {
    setActiveTab('patients')
  }

  // Handle Patient Registration Form
  const handlePatientSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    
    try {
      const response = await api.post('/auth/patient/register', {
        name: formData.get('patientName'),
        age: parseInt(formData.get('age')),
        gender: formData.get('gender'),
        contact: formData.get('contact'),
        identificationType: formData.get('identificationType'),
        identificationId: formData.get('identificationId'),
        registeredBy: user?.id || user?._id
      })

      const newPatient = response.data.patient
      const tempPassword = response.data.credentials?.password || formData.get('identificationId')
      alert(`Patient ${newPatient.name} registered successfully!\nPatient ID: ${newPatient.patientId}\nTemporary Password: ${tempPassword}`)
      setShowPatientModal(false)
      e.target.reset()
      await loadPatients()
      setActiveTab('patients')
    } catch (error) {
      alert(error.response?.data?.message || 'Error registering patient')
    }
  }

  // Start Voice Recording using Web Speech API
  const startVoiceRecording = () => {
    // Check if browser supports speech recognition
    if (!isSpeechRecognitionSupported) {
      setSpeechError('Your browser does not support voice input, please type manually')
      return
    }

    try {
      // Initialize speech recognition
      const recognition = new SpeechRecognition()
      recognitionRef.current = recognition

      // Set language to Bengali (Bangla)
      recognition.lang = 'bn-BD'
      recognition.continuous = true
      recognition.interimResults = true

      // Handle recognition results
      recognition.onresult = (event) => {
        let interimTranscript = ''
        let finalTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' '
          } else {
            interimTranscript += transcript
          }
        }

        // Update voice text with final results
        if (finalTranscript) {
          setVoiceText((prev) => prev + finalTranscript)
        }
      }

      // Handle errors
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone access denied. Please allow microphone permissions.')
        } else if (event.error === 'no-speech') {
          setSpeechError('No speech detected. Please try again.')
        } else {
          setSpeechError(`Speech recognition error: ${event.error}`)
        }
        setIsRecording(false)
      }

      // Handle end of recognition
      recognition.onend = () => {
        setIsRecording(false)
      }

      // Start recognition
      recognition.start()
      setIsRecording(true)
      setSpeechError('')

    } catch (error) {
      console.error('Error starting speech recognition:', error)
      setSpeechError('Failed to start voice recording. Please try again.')
    }
  }

  // Stop Voice Recording
  const stopVoiceRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsRecording(false)
  }

  // Handle Consultation Submission with AI Diagnosis
  const handleConsultationSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    
    const selectedPatientId = formData.get('patientSelect')
    const selectedPatient = patients.find(p => p.id === selectedPatientId)

    if (!selectedPatient) {
      alert('Please select a patient')
      return
    }

    const symptomsText = formData.get('symptoms') || voiceText
    if (!symptomsText.trim() && !uploadedFile) {
      alert('Please enter symptoms or upload a document')
      return
    }

    // Parse blood pressure
    const bpStr = formData.get('bloodPressure') || ''
    let systolic = null, diastolic = null
    if (bpStr.includes('/')) {
      const [sys, dia] = bpStr.split('/')
      systolic = parseInt(sys)
      diastolic = parseInt(dia)
    }

    try {
      // Build multipart FormData for file + text fields
      const submitData = new FormData()
      submitData.append('patientId', selectedPatientId)
      submitData.append('symptoms', symptomsText)
      if (formData.get('temperature')) submitData.append('temperature', formData.get('temperature'))
      if (systolic) {
        submitData.append('bloodPressureSystolic', systolic)
        submitData.append('bloodPressureDiastolic', diastolic)
      }
      if (formData.get('otherVitals')) submitData.append('otherVitals', formData.get('otherVitals'))
      submitData.append('voiceInputText', voiceText || '')
      if (formData.get('consultationDate')) submitData.append('consultationDate', formData.get('consultationDate'))
      if (uploadedFile) submitData.append('document', uploadedFile)

      const response = await api.post('/consultations', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      const result = response.data.consultation
      setAiResult(result)
      setShowAiResultModal(true)

      // Refresh data
      await loadConsultations()
      await loadPatients()
      
      e.target.reset()
      setVoiceText('')
      removeUploadedFile()
    } catch (error) {
      alert(error.response?.data?.message || 'Error creating consultation')
    }
  }

  // Count today's consultations
  const todayConsultations = consultations.filter(c => {
    const consultDate = new Date(c.date).toLocaleDateString()
    const today = new Date().toLocaleDateString()
    return consultDate === today
  }).length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Rural Medical Worker Dashboard</h1>
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
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('patients')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'patients'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Patients
            </button>
            <button
              onClick={() => setActiveTab('consultation')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'consultation'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              New Consultation
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Welcome Card */}
              <div className="col-span-full bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Welcome, {user?.name || 'Medical Worker'}!
                </h2>
                <p className="text-gray-600">
                  Register new patients, record consultations, and manage health records
                </p>
              </div>

              {/* Total Patients */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">👥 Total Patients</h3>
                <p className="text-3xl font-bold text-blue-600 mb-2">{patients.length}</p>
                <p className="text-gray-600 text-sm">Registered under you</p>
              </div>

              {/* Today's Consultations */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Today's Consultations</h3>
                <p className="text-3xl font-bold text-green-600 mb-2">{todayConsultations}</p>
                <p className="text-gray-600 text-sm">Recorded today</p>
              </div>

              {/* Pending Reviews */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">⏳ Pending Reviews</h3>
                <p className="text-3xl font-bold text-yellow-600 mb-2">{consultations.filter(c => c.status === 'Pending Review').length}</p>
                <p className="text-gray-600 text-sm">Awaiting expert feedback</p>
              </div>

              {/* High Risk Cases */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🚨 High Risk Cases</h3>
                <p className="text-3xl font-bold text-red-600 mb-2">{consultations.filter(c => c.status === 'High Risk').length}</p>
                <p className="text-gray-600 text-sm">Require urgent attention</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={handleRegisterPatient}
                  className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition duration-300 text-left cursor-pointer"
                >
                  <p className="font-semibold text-blue-900">Register New Patient</p>
                  <p className="text-sm text-blue-700 mt-1">Add patient with ID/Birth Certificate</p>
                </button>
                <button
                  onClick={handleRecordConsultation}
                  className="p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition duration-300 text-left cursor-pointer"
                >
                  <p className="font-semibold text-green-900">Record Consultation</p>
                  <p className="text-sm text-green-700 mt-1">Document patient symptoms</p>
                </button>
                <button
                  onClick={() => setActiveTab('consultation')}
                  className="p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition duration-300 text-left cursor-pointer"
                >
                  <p className="font-semibold text-purple-900">Voice Input</p>
                  <p className="text-sm text-purple-700 mt-1">Record symptoms in Bangla</p>
                </button>
                <button
                  onClick={handleViewPatients}
                  className="p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition duration-300 text-left cursor-pointer"
                >
                  <p className="font-semibold text-orange-900">View Patients</p>
                  <p className="text-sm text-orange-700 mt-1">Check your patient list</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Patients Tab */}
        {activeTab === 'patients' && (
          <div>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Your Patients</h2>
                <button
                  onClick={handleRegisterPatient}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300"
                >
                  + Add Patient
                </button>
              </div>
              {patients.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No patients registered yet</p>
                  <button
                    onClick={handleRegisterPatient}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300"
                  >
                    Register First Patient
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Patient ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Age
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Gender
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Registered
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Consultations
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {patients.map((patient) => {
                        const patientConsultations = consultations.filter(c => c.patientId === patient.id)
                        return (
                          <tr key={patient.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{patient.id}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{patient.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{patient.age}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{patient.gender}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{patient.contact}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{patient.registeredDate}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                {patientConsultations.length}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <button 
                                onClick={() => setActiveTab('consultation')}
                                className="text-blue-600 hover:text-blue-900 font-medium"
                              >
                                Record
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Consultations History */}
            {consultations.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Recent Consultations</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Consultation ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Patient Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Temperature
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Blood Pressure
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Symptoms
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {consultations.slice().reverse().map((consultation) => (
                        <tr key={consultation.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{consultation.id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{consultation.patientName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{consultation.date}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{consultation.temperature || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{consultation.bloodPressure || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              consultation.status === 'Pending Review' ? 'bg-yellow-100 text-yellow-800' :
                              consultation.status === 'High Risk' ? 'bg-red-100 text-red-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {consultation.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={consultation.symptoms}>
                            {consultation.symptoms?.substring(0, 40)}...
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* New Consultation Tab */}
        {activeTab === 'consultation' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Record New Consultation</h2>

            {patients.length === 0 ? (
              <div className="text-center py-8 bg-blue-50 rounded-lg border-2 border-blue-200">
                <p className="text-gray-600 mb-4">No patients registered yet</p>
                <p className="text-gray-500 text-sm mb-4">Please register a patient first to record consultations</p>
                <button
                  onClick={handleRegisterPatient}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300"
                >
                  Register Patient
                </button>
              </div>
            ) : (
              <form onSubmit={handleConsultationSubmit} className="space-y-6">
                {/* Patient Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">Select Patient</label>
                    <select
                      name="patientSelect"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Select a patient --</option>
                      {patients.map((patient) => (
                        <option key={patient.id} value={patient.id}>
                          {patient.name} ({patient.id})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">Consultation Date</label>
                    <input
                      type="date"
                      name="consultationDate"
                      defaultValue={new Date().toISOString().split('T')[0]}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Symptom Input */}
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Symptoms (Voice or Text)</label>
                  
                  {/* Show error if browser doesn't support speech recognition */}
                  {!isSpeechRecognitionSupported && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                      ⚠️ Your browser does not support voice input, please type manually
                    </div>
                  )}
                  
                  {/* Show speech error if any */}
                  {speechError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      ⚠️ {speechError}
                    </div>
                  )}
                  
                  <div className="flex gap-2 mb-4">
                    {!isRecording ? (
                      <button
                        type="button"
                        onClick={startVoiceRecording}
                        disabled={!isSpeechRecognitionSupported}
                        className={`px-4 py-2 rounded-lg transition duration-300 flex items-center gap-2 ${
                          isSpeechRecognitionSupported 
                            ? 'bg-blue-600 text-white hover:bg-blue-700' 
                            : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                        }`}
                      >
                        🎤 Start Voice Recording
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopVoiceRecording}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-300 flex items-center gap-2 animate-pulse"
                      >
                        ⏹️ Stop Recording
                      </button>
                    )}
                    <span className="text-sm text-gray-600 self-center">
                      {isRecording ? '🎙️ Listening... Speak in Bangla now!' : 'Click to record symptoms in Bangla'}
                    </span>
                  </div>

                  <textarea
                    name="symptoms"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="4"
                    placeholder="Enter or paste symptoms here... (or use voice recording above)"
                    value={voiceText}
                    onChange={(e) => setVoiceText(e.target.value)}
                  ></textarea>
                  {voiceText && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded text-sm text-gray-700">
                      <strong>Voice Input:</strong> {voiceText}
                    </div>
                  )}
                </div>

                {/* Additional Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">Temperature (°C)</label>
                    <input
                      type="number"
                      name="temperature"
                      step="0.1"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 98.6"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">Blood Pressure</label>
                    <input
                      type="text"
                      name="bloodPressure"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 120/80"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">Other Vitals</label>
                    <input
                      type="text"
                      name="otherVitals"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Pulse rate"
                    />
                  </div>
                </div>

                {/* Document Upload Section */}
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    📄 ডকুমেন্ট/ছবি আপলোড (ঐচ্ছিক)
                  </label>
                  <p className="text-sm text-gray-500 mb-2">
                    মেডিকেল রিপোর্ট, ক্ষতের ছবি, প্রেসক্রিপশন, X-Ray, বা যেকোনো ডকুমেন্ট আপলোড করুন — AI দেখে রোগ নির্ণয় করবে
                  </p>

                  {/* File Drop Zone */}
                  <div
                    className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      const file = e.dataTransfer.files[0]
                      if (file) {
                        setUploadedFile(file)
                        if (file.type.startsWith('image/')) {
                          const reader = new FileReader()
                          reader.onload = (ev) => setUploadedFilePreview(ev.target.result)
                          reader.readAsDataURL(file)
                        } else {
                          setUploadedFilePreview(null)
                        }
                      }
                    }}
                  >
                    {!uploadedFile ? (
                      <>
                        <div className="text-4xl mb-2">📷</div>
                        <p className="text-gray-600 font-medium">ছবি/ডকুমেন্ট ড্র্যাগ করুন অথবা ক্লিক করুন</p>
                        <p className="text-sm text-gray-400 mt-1">JPEG, PNG, GIF, WebP, PDF সাপোর্ট হাবে র্যা • সর্বোচ্চ 10MB</p>
                      </>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {uploadedFilePreview ? (
                            <img
                              src={uploadedFilePreview}
                              alt="Preview"
                              className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center text-2xl">📄</div>
                          )}
                          <div className="text-left">
                            <p className="font-medium text-gray-800 text-sm">{uploadedFile.name}</p>
                            <p className="text-xs text-gray-500">{(uploadedFile.size / 1024).toFixed(1)} KB • {uploadedFile.type}</p>
                            <p className="text-xs text-green-600 mt-0.5">✅ AI এই ডকুমেন্ট বিশ্লেষণ করবে</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeUploadedFile() }}
                          className="text-red-500 hover:text-red-700 text-xl font-bold px-2"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition duration-300"
                  >
                    Submit Consultation
                  </button>
                  <button
                    type="reset"
                    onClick={() => setVoiceText('')}
                    className="flex-1 px-6 py-2 bg-gray-300 text-gray-800 rounded-lg font-semibold hover:bg-gray-400 transition duration-300"
                  >
                    Clear
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </main>

      {/* Patient Registration Modal */}
      {showPatientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Register New Patient</h2>
              <button
                onClick={() => setShowPatientModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handlePatientSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Patient Name</label>
                <input
                  type="text"
                  name="patientName"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Age</label>
                  <input
                    type="number"
                    name="age"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Gender</label>
                  <select
                    name="gender"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">Contact Number</label>
                <input
                  type="tel"
                  name="contact"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">ID Type</label>
                <select
                  name="identificationType"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select</option>
                  <option value="National ID">National ID</option>
                  <option value="Birth Certificate">Birth Certificate</option>
                  <option value="Passport">Passport</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">ID Number</label>
                <input
                  type="text"
                  name="identificationId"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPatientModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition duration-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300"
                >
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Diagnosis Result Modal */}
      {showAiResultModal && aiResult && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className={`rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto ${
            aiResult.riskLevel === 'High' ? 'bg-red-50 border-4 border-red-500' :
            aiResult.riskLevel === 'Medium' ? 'bg-yellow-50 border-4 border-yellow-500' :
            'bg-green-50 border-4 border-green-500'
          }`}>
            {/* Header */}
            <div className={`sticky top-0 p-6 flex justify-between items-center border-b-2 ${
              aiResult.riskLevel === 'High' ? 'bg-red-600 text-white border-red-700' :
              aiResult.riskLevel === 'Medium' ? 'bg-yellow-500 text-white border-yellow-600' :
              'bg-green-600 text-white border-green-700'
            }`}>
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  {aiResult.riskLevel === 'High' && '🚨'}
                  {aiResult.riskLevel === 'Medium' && '⚠️'}
                  {aiResult.riskLevel === 'Low' && '✅'}
                  AI Diagnosis Result
                </h2>
                <p className="text-sm mt-1 opacity-90">
                  Patient: {aiResult.patientName} | ID: {aiResult.consultationId}
                </p>
              </div>
              <button
                onClick={() => setShowAiResultModal(false)}
                className="text-white hover:opacity-80 text-3xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Emergency Alert for HIGH */}
              {aiResult.riskLevel === 'High' && (
                <div className="bg-red-100 border-2 border-red-400 rounded-lg p-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">🚨</span>
                    <div>
                      <h3 className="text-xl font-bold text-red-800">RED ALERT - EMERGENCY</h3>
                      <p className="text-red-700 font-medium">রোগীকে এখনই হাসপাতালে / Medical Expert এর কাছে নিয়ে যান!</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Medium Alert */}
              {aiResult.riskLevel === 'Medium' && (
                <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">⚠️</span>
                    <div>
                      <h3 className="text-xl font-bold text-yellow-800">Medical Expert এর পরামর্শ প্রয়োজন</h3>
                      <p className="text-yellow-700 font-medium">রোগীর তথ্য Medical Expert এর কাছে Forward করা হয়েছে</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Low - All Good */}
              {aiResult.riskLevel === 'Low' && (
                <div className="bg-green-100 border-2 border-green-400 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">✅</span>
                    <div>
                      <h3 className="text-xl font-bold text-green-800">Low Risk - বাড়িতে চিকিৎসা সম্ভব</h3>
                      <p className="text-green-700 font-medium">AI এর পরামর্শ অনুযায়ী চিকিৎসা নিন</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Risk Level Badge */}
              <div className="flex items-center gap-4">
                <span className={`px-6 py-3 rounded-full text-lg font-bold ${
                  aiResult.riskLevel === 'High' ? 'bg-red-200 text-red-900' :
                  aiResult.riskLevel === 'Medium' ? 'bg-yellow-200 text-yellow-900' :
                  'bg-green-200 text-green-900'
                }`}>
                  {aiResult.riskLevel === 'High' ? '🔴' : aiResult.riskLevel === 'Medium' ? '🟡' : '🟢'} {aiResult.riskLevel} Risk
                </span>
                {aiResult.detectedDisease && (
                  <span className="text-lg font-semibold text-gray-800">
                    রোগ: {aiResult.detectedDisease}
                  </span>
                )}
              </div>

              {/* Disease Description */}
              {aiResult.diseaseDescription && (
                <div className="bg-white rounded-lg p-4 border">
                  <h4 className="font-semibold text-gray-900 mb-1">🔍 রোগ বিবরণ</h4>
                  <p className="text-gray-700">{aiResult.diseaseDescription}</p>
                </div>
              )}

              {/* AI Recommendation */}
              <div className="bg-white rounded-lg p-4 border">
                <h4 className="font-semibold text-gray-900 mb-2">🤖 AI পরামর্শ</h4>
                <p className="text-gray-700 whitespace-pre-line">{aiResult.aiRecommendation}</p>
              </div>

              {/* Instructions */}
              {aiResult.aiInstructions && (
                <div className={`rounded-lg p-4 border ${
                  aiResult.riskLevel === 'High' ? 'bg-red-100 border-red-300' :
                  aiResult.riskLevel === 'Medium' ? 'bg-yellow-100 border-yellow-300' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <h4 className="font-semibold text-gray-900 mb-2">📋 নির্দেশনা</h4>
                  <p className="text-gray-700">{aiResult.aiInstructions}</p>
                </div>
              )}

              {/* Suggested Medicines (only for Low/Medium) */}
              {aiResult.suggestedMedicines && aiResult.suggestedMedicines.length > 0 && (
                <div className="bg-white rounded-lg p-4 border">
                  <h4 className="font-semibold text-gray-900 mb-3">💊 প্রস্তাবিত ওষুধ</h4>
                  <div className="space-y-3">
                    {aiResult.suggestedMedicines.map((med, index) => (
                      <div key={index} className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <p className="font-bold text-blue-900">{index + 1}. {med.name}</p>
                        <div className="grid grid-cols-3 gap-2 mt-1 text-sm text-blue-800">
                          <p><span className="font-medium">মাত্রা:</span> {med.dosage}</p>
                          <p><span className="font-medium">সময়:</span> {med.frequency}</p>
                          <p><span className="font-medium">সময়কাল:</span> {med.duration}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* High Risk - No Medicine Warning */}
              {aiResult.riskLevel === 'High' && (
                <div className="bg-red-100 border border-red-300 rounded-lg p-4">
                  <p className="text-red-800 font-bold text-center text-lg">
                    ⛔ ডাক্তারের পরামর্শ ছাড়া কোনো ওষুধ দেবেন না!
                  </p>
                  <p className="text-red-700 text-center mt-1">
                    রোগীকে এখনই নিকটস্থ হাসপাতালে নিয়ে যান
                  </p>
                </div>
              )}

              {/* Forward Status */}
              {aiResult.forwardedToExpert && (
                <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
                  <p className="text-blue-800 font-semibold text-center flex items-center justify-center gap-2">
                    📤 রোগীর সম্পূর্ণ তথ্য Medical Expert এর কাছে পাঠানো হয়েছে
                  </p>
                </div>
              )}

              {/* Close Button */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowAiResultModal(false)
                    setActiveTab('patients')
                  }}
                  className={`flex-1 px-6 py-3 rounded-lg font-bold text-white transition duration-300 ${
                    aiResult.riskLevel === 'High' ? 'bg-red-600 hover:bg-red-700' :
                    aiResult.riskLevel === 'Medium' ? 'bg-yellow-600 hover:bg-yellow-700' :
                    'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  বুঝেছি, বন্ধ করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
