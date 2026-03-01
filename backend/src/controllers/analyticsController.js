import { Consultation, Patient, User } from '../models/index.js'

// Helper function to parse symptoms and count keyword frequency
const parseSymptoms = (symptomsText) => {
  if (!symptomsText || typeof symptomsText !== 'string') {
    return {}
  }

  // Common symptom keywords to look for
  const symptomKeywords = [
    'fever', 'cough', 'cold', 'headache', 'fatigue', 'nausea', 'vomiting',
    'diarrhea', 'stomach pain', 'chest pain', 'breathing difficulty', 'shortness of breath',
    'sore throat', 'runny nose', 'body ache', 'muscle pain', 'joint pain',
    'dizziness', 'weakness', 'loss of appetite', 'weight loss', 'skin rash',
    'allergy', 'infection', 'flu', 'malaria', 'typhoid', 'dengue', 'cold',
    'asthma', 'diabetes', 'hypertension', 'heart', 'liver', 'kidney',
    'pregnancy', 'childbirth', 'delivery', 'uterus', 'vaginal', 'bleeding',
    'pain', 'swelling', 'wound', 'injury', 'burn', 'fracture', 'sprain',
    'eye', 'ear', 'nose', 'throat', 'tooth', 'dental', 'skin', 'hair',
    'mental', 'stress', 'anxiety', 'depression', 'sleep', 'insomnia',
    'urination', 'stool', 'constipation', 'indigestion', 'heartburn',
    'anemia', 'nutrition', 'vitamin', 'deficiency', 'swollen', 'infected'
  ]

  const text = symptomsText.toLowerCase()
  const counts = {}

  symptomKeywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
    const matches = text.match(regex)
    if (matches) {
      counts[keyword] = matches.length
    }
  })

  return counts
}

// 1. Get Disease Stats - GET /api/analytics/diseases
export const getDiseaseStats = async (req, res) => {
  try {
    // Get consultations grouped by risk level
    const consultationsByRisk = await Consultation.aggregate([
      {
        $group: {
          _id: '$riskLevel',
          count: { $sum: 1 }
        }
      }
    ])

    // Transform into readable format
    const riskLevelCounts = {
      Low: 0,
      Medium: 0,
      High: 0,
      Pending: 0
    }

    consultationsByRisk.forEach(item => {
      if (riskLevelCounts.hasOwnProperty(item._id)) {
        riskLevelCounts[item._id] = item.count
      }
    })

    // Get all consultations to parse symptoms
    const allConsultations = await Consultation.find({ symptoms: { $exists: true, $ne: '' } })

    // Parse symptoms and count frequencies
    const symptomCounts = {}
    allConsultations.forEach(consultation => {
      const parsed = parseSymptoms(consultation.symptoms)
      Object.keys(parsed).forEach(symptom => {
        symptomCounts[symptom] = (symptomCounts[symptom] || 0) + parsed[symptom]
      })
    })

    // Get top 5 most common symptoms
    const topSymptoms = Object.entries(symptomCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([symptom, count]) => ({ symptom, count }))

    return res.status(200).json({
      message: 'Disease stats retrieved successfully',
      stats: {
        consultationsByRiskLevel: riskLevelCounts,
        topSymptoms
      }
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

// 2. Get Case Trends - GET /api/analytics/trends
export const getCaseTrends = async (req, res) => {
  try {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    // Get consultations grouped by date for last 30 days
    const consultationsByDate = await Consultation.aggregate([
      {
        $match: {
          consultationDate: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$consultationDate' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ])

    // Get high risk cases this week (last 7 days)
    const highRiskThisWeek = await Consultation.countDocuments({
      riskLevel: 'High',
      consultationDate: { $gte: oneWeekAgo }
    })

    // Get high risk cases last week (7-14 days ago)
    const highRiskLastWeek = await Consultation.countDocuments({
      riskLevel: 'High',
      consultationDate: { $gte: twoWeeksAgo, $lt: oneWeekAgo }
    })

    return res.status(200).json({
      message: 'Case trends retrieved successfully',
      trends: {
        consultationsByDate: consultationsByDate.map(item => ({
          date: item._id,
          count: item.count
        })),
        highRiskThisWeek,
        highRiskLastWeek,
        highRiskTrend: highRiskLastWeek > 0 
          ? ((highRiskThisWeek - highRiskLastWeek) / highRiskLastWeek * 100).toFixed(1)
          : 0
      }
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

// 3. Get Geographic Data (Overview) - GET /api/analytics/overview
export const getGeographicData = async (req, res) => {
  try {
    // Get total patients
    const totalPatients = await Patient.countDocuments()

    // Get total consultations
    const totalConsultations = await Consultation.countDocuments()

    // Get counts by risk level
    const riskLevelCounts = await Consultation.aggregate([
      {
        $group: {
          _id: '$riskLevel',
          count: { $sum: 1 }
        }
      }
    ])

    const highRiskCases = riskLevelCounts.find(r => r._id === 'High')?.count || 0
    const mediumRiskCases = riskLevelCounts.find(r => r._id === 'Medium')?.count || 0
    const lowRiskCases = riskLevelCounts.find(r => r._id === 'Low')?.count || 0

    // Get pending reviews (status = 'Pending Review')
    const pendingReviews = await Consultation.countDocuments({ status: 'Pending Review' })

    return res.status(200).json({
      message: 'Geographic data overview retrieved successfully',
      overview: {
        totalPatients,
        totalConsultations,
        highRiskCases,
        mediumRiskCases,
        lowRiskCases,
        pendingReviews
      }
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

