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

export default function HealthAuthorityDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [overview, setOverview] = useState(null)
  const [trends, setTrends] = useState(null)
  const [diseases, setDiseases] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load all data on component mount
  useEffect(() => {
    loadData()
  }, [])

  // Load all analytics data
  const loadData = async () => {
    try {
      setIsLoading(true)
      
      // Fetch overview
      const overviewResponse = await api.get('/analytics/overview')
      setOverview(overviewResponse.data.overview)

      // Fetch trends
      const trendsResponse = await api.get('/analytics/trends')
      setTrends(trendsResponse.data.trends)

      // Fetch disease stats
      const diseasesResponse = await api.get('/analytics/diseases')
      setDiseases(diseasesResponse.data.stats)
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  // Calculate risk distribution percentages
  const getRiskDistribution = () => {
    if (!overview) return []
    const total = overview.highRiskCases + overview.mediumRiskCases + overview.lowRiskCases
    if (total === 0) return []

    return [
      { 
        level: 'High', 
        count: overview.highRiskCases, 
        percentage: ((overview.highRiskCases / total) * 100).toFixed(1),
        color: 'bg-red-500',
        bgColor: 'bg-red-50',
        textColor: 'text-red-800'
      },
      { 
        level: 'Medium', 
        count: overview.mediumRiskCases, 
        percentage: ((overview.mediumRiskCases / total) * 100).toFixed(1),
        color: 'bg-yellow-500',
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-800'
      },
      { 
        level: 'Low', 
        count: overview.lowRiskCases, 
        percentage: ((overview.lowRiskCases / total) * 100).toFixed(1),
        color: 'bg-green-500',
        bgColor: 'bg-green-50',
        textColor: 'text-green-800'
      }
    ]
  }

  const riskDistribution = getRiskDistribution()

  // Get last 7 days from trends
  const getLast7Days = () => {
    if (!trends?.consultationsByDate) return []
    
    const now = new Date()
    const last7Days = []
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      const dayData = trends.consultationsByDate.find(d => d.date === dateStr)
      last7Days.push({
        date: dateStr,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        count: dayData?.count || 0
      })
    }
    
    return last7Days
  }

  const last7Days = getLast7Days()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Health Authority Dashboard</h1>
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
            <p className="text-gray-500">Loading analytics data...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Overview Stats Cards */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Overview Statistics</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* Total Patients */}
                <div className="bg-white rounded-lg shadow p-4">
                  <p className="text-sm text-gray-500">Total Patients</p>
                  <p className="text-2xl font-bold text-blue-600">{overview?.totalPatients || 0}</p>
                </div>

                {/* Total Consultations */}
                <div className="bg-white rounded-lg shadow p-4">
                  <p className="text-sm text-gray-500">Consultations</p>
                  <p className="text-2xl font-bold text-purple-600">{overview?.totalConsultations || 0}</p>
                </div>

                {/* High Risk */}
                <div className="bg-white rounded-lg shadow p-4">
                  <p className="text-sm text-gray-500">High Risk</p>
                  <p className="text-2xl font-bold text-red-600">{overview?.highRiskCases || 0}</p>
                </div>

                {/* Medium Risk */}
                <div className="bg-white rounded-lg shadow p-4">
                  <p className="text-sm text-gray-500">Medium Risk</p>
                  <p className="text-2xl font-bold text-yellow-600">{overview?.mediumRiskCases || 0}</p>
                </div>

                {/* Low Risk */}
                <div className="bg-white rounded-lg shadow p-4">
                  <p className="text-sm text-gray-500">Low Risk</p>
                  <p className="text-2xl font-bold text-green-600">{overview?.lowRiskCases || 0}</p>
                </div>

                {/* Pending Reviews */}
                <div className="bg-white rounded-lg shadow p-4">
                  <p className="text-sm text-gray-500">Pending Reviews</p>
                  <p className="text-2xl font-bold text-orange-600">{overview?.pendingReviews || 0}</p>
                </div>
              </div>
            </div>

            {/* Risk Distribution */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Risk Distribution</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {riskDistribution.map((item) => (
                  <div key={item.level} className={`${item.bgColor} rounded-lg p-4`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className={`font-semibold ${item.textColor}`}>{item.level} Risk</span>
                      <span className={`text-2xl font-bold ${item.textColor}`}>{item.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                      <div 
                        className={`${item.color} h-3 rounded-full`} 
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600">{item.count} cases</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Case Trends - Last 7 Days */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Case Trends - Last 7 Days</h2>
              {last7Days.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Day</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Date</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Consultations</th>
                      </tr>
                    </thead>
                    <tbody>
                      {last7Days.map((day) => (
                        <tr key={day.date} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{day.dayName}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{day.date}</td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center">
                              <span className="font-medium text-gray-900 mr-2">{day.count}</span>
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-500 h-2 rounded-full" 
                                  style={{ width: `${Math.min((day.count / Math.max(...last7Days.map(d => d.count), 1)) * 100, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No consultation data available</p>
              )}
            </div>

            {/* Common Symptoms */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Common Symptoms</h2>
              {diseases?.topSymptoms && diseases.topSymptoms.length > 0 ? (
                <div className="space-y-3">
                  {diseases.topSymptoms.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <span className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-bold mr-3">
                          {index + 1}
                        </span>
                        <span className="font-medium text-gray-900 capitalize">{item.symptom}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-lg font-bold text-blue-600 mr-2">{item.count}</span>
                        <span className="text-sm text-gray-500">cases</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No symptom data available</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

