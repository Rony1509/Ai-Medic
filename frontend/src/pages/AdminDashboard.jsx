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

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('stats')
  const [stats, setStats] = useState(null)
  const [allUsers, setAllUsers] = useState([])
  const [pendingUsers, setPendingUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // Load data on component mount
  useEffect(() => {
    loadStats()
    loadUsers()
  }, [])

  // Load system stats
  const loadStats = async () => {
    try {
      const response = await api.get('/admin/stats')
      setStats(response.data.stats)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  // Load all users
  const loadUsers = async () => {
    try {
      setIsLoading(true)
      const response = await api.get('/admin/users')
      const usersData = response.data.users || []
      
      // Transform users data
      const transformedUsers = usersData.map(u => ({
        id: u._id,
        name: u.fullName,
        email: u.email,
        role: u.role,
        isApproved: u.isApproved,
        createdAt: new Date(u.createdAt).toLocaleDateString()
      }))
      
      setAllUsers(transformedUsers)
      
      // Filter pending users
      setPendingUsers(transformedUsers.filter(u => !u.isApproved))
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Approve user
  const handleApprove = async (userId) => {
    try {
      await api.put(`/admin/users/${userId}/approve`)
      alert('User approved successfully!')
      await loadUsers()
      await loadStats()
    } catch (error) {
      alert(error.response?.data?.message || 'Error approving user')
    }
  }

  // Reject user (delete)
  const handleReject = async (userId) => {
    if (!confirm('Are you sure you want to reject/delete this user? This action cannot be undone.')) {
      return
    }
    
    try {
      await api.delete(`/admin/users/${userId}`)
      alert('User rejected successfully!')
      await loadUsers()
      await loadStats()
    } catch (error) {
      alert(error.response?.data?.message || 'Error rejecting user')
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  // Get role display name
  const getRoleDisplay = (role) => {
    switch (role) {
      case 'admin': return 'Admin'
      case 'medical-expert': return 'Medical Expert'
      case 'rural-medical-worker': return 'RMW'
      case 'health-authority': return 'Health Authority'
      default: return role
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
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
              onClick={() => setActiveTab('stats')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'stats'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pending'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pending Approvals ({pendingUsers.length})
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Users ({allUsers.length})
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading...</p>
          </div>
        ) : (
          <>
            {/* Stats Overview Tab */}
            {activeTab === 'stats' && stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Users */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Users</h3>
                  <p className="text-4xl font-bold text-blue-600">{stats.totalUsers}</p>
                  <p className="text-sm text-gray-500 mt-2">Registered users</p>
                </div>

                {/* Total Patients */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Patients</h3>
                  <p className="text-4xl font-bold text-green-600">{stats.totalPatients}</p>
                  <p className="text-sm text-gray-500 mt-2">Registered patients</p>
                </div>

                {/* Total Consultations */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Consultations</h3>
                  <p className="text-4xl font-bold text-purple-600">{stats.totalConsultations}</p>
                  <p className="text-sm text-gray-500 mt-2">Total recorded</p>
                </div>

                {/* Pending Approvals */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Pending Approvals</h3>
                  <p className="text-4xl font-bold text-yellow-600">{stats.pendingApprovals}</p>
                  <p className="text-sm text-gray-500 mt-2">Users awaiting approval</p>
                </div>

                {/* Risk Level Distribution */}
                <div className="col-span-full bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Consultations by Risk Level</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{stats.consultationsByRiskLevel?.Low || 0}</p>
                      <p className="text-sm text-gray-600">Low Risk</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <p className="text-2xl font-bold text-yellow-600">{stats.consultationsByRiskLevel?.Medium || 0}</p>
                      <p className="text-sm text-gray-600">Medium Risk</p>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <p className="text-2xl font-bold text-red-600">{stats.consultationsByRiskLevel?.High || 0}</p>
                      <p className="text-sm text-gray-600">High Risk</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-600">{stats.consultationsByRiskLevel?.Pending || 0}</p>
                      <p className="text-sm text-gray-600">Pending</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pending Approvals Tab */}
            {activeTab === 'pending' && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Pending User Approvals</h2>
                  <p className="text-sm text-gray-600 mt-1">Review and approve or reject new user registrations</p>
                </div>
                
                {pendingUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No pending approvals</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Role
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Registration Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {pendingUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {user.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                {getRoleDisplay(user.role)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.createdAt}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <button
                                onClick={() => handleApprove(user.id)}
                                className="bg-green-600 text-white px-3 py-1 rounded mr-2 hover:bg-green-700 transition"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(user.id)}
                                className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition"
                              >
                                Reject
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

            {/* All Users Tab */}
            {activeTab === 'users' && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">All Users</h2>
                  <p className="text-sm text-gray-600 mt-1">View all registered and approved users</p>
                </div>
                
                {allUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No users found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Role
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {allUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {user.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                {getRoleDisplay(user.role)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded text-xs ${
                                user.isApproved 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {user.isApproved ? 'Approved' : 'Pending'}
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
    </div>
  )
}

