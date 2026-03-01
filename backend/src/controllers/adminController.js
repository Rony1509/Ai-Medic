import { User, Patient, Consultation } from '../models/index.js'

// 1. Get All Users - GET /api/admin/users
// Only admin role can access
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password')
    
    return res.status(200).json({
      message: 'Users retrieved successfully',
      count: users.length,
      users
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

// 2. Approve User - PUT /api/admin/users/:id/approve
// Only admin role can access
export const approveUser = async (req, res) => {
  try {
    const { id } = req.params

    // Find user by ID
    const user = await User.findById(id)
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Check if user is already approved
    if (user.isApproved) {
      return res.status(400).json({ message: 'User is already approved' })
    }

    // Update user approval status
    user.isApproved = true
    await user.save()

    return res.status(200).json({
      message: 'User approved successfully',
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isApproved: user.isApproved
      }
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

// 3. Reject User (Delete User) - DELETE /api/admin/users/:id
// Only admin role can access
export const rejectUser = async (req, res) => {
  try {
    const { id } = req.params

    // Find user by ID
    const user = await User.findById(id)
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user.userId) {
      return res.status(400).json({ message: 'Cannot delete your own admin account' })
    }

    // Delete user from database
    await User.findByIdAndDelete(id)

    return res.status(200).json({
      message: 'User deleted successfully'
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

// 4. Get System Stats - GET /api/admin/stats
// Only admin role can access
export const getSystemStats = async (req, res) => {
  try {
    // Get total counts
    const totalUsers = await User.countDocuments()
    const totalPatients = await Patient.countDocuments()
    const totalConsultations = await Consultation.countDocuments()
    
    // Get pending approvals (users who are not approved)
    const pendingApprovals = await User.countDocuments({ isApproved: false })
    
    // Get consultations by risk level
    const consultationsByRiskLevel = await Consultation.aggregate([
      {
        $group: {
          _id: '$riskLevel',
          count: { $sum: 1 }
        }
      }
    ])

    // Transform the aggregation result into a more readable format
    const riskLevelCounts = {
      Low: 0,
      Medium: 0,
      High: 0,
      Pending: 0
    }

    consultationsByRiskLevel.forEach(item => {
      if (riskLevelCounts.hasOwnProperty(item._id)) {
        riskLevelCounts[item._id] = item.count
      }
    })

    return res.status(200).json({
      message: 'System stats retrieved successfully',
      stats: {
        totalUsers,
        totalPatients,
        totalConsultations,
        pendingApprovals,
        consultationsByRiskLevel: riskLevelCounts
      }
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

