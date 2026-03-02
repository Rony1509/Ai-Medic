import { Consultation, Patient, User } from '../models/index.js'
import { diagnoseWithDocument } from '../utils/aiDiagnosis.js'

// =====================================================
// AI Disease Diagnosis Database
// Comprehensive disease-symptom mapping with severity
// =====================================================

const DISEASE_DATABASE = {
  // === HIGH RISK DISEASES ===
  'Heart Attack': {
    keywords: ['chest pain', 'chest tightness', 'left arm pain', 'jaw pain', 'heart attack', 'বুকে ব্যথা', 'বুকে চাপ', 'হার্ট অ্যাটাক'],
    severity: 'High',
    description: 'Possible cardiac emergency - Acute myocardial infarction suspected',
    medicines: [],
    instructions: '🚨 RED ALERT: Call 999 immediately. Do NOT give any medicine without doctor. Rush to nearest hospital. Do not let patient walk. Keep patient calm and still.',
    emergency: true
  },
  'Stroke': {
    keywords: ['stroke', 'face drooping', 'arm weakness', 'speech difficulty', 'sudden numbness', 'স্ট্রোক', 'মুখ বাঁকা', 'হাত অবশ'],
    severity: 'High',
    description: 'Possible cerebrovascular accident (Stroke)',
    medicines: [],
    instructions: '🚨 RED ALERT: Call 999 immediately. Note the time symptoms started. Do NOT give food or water. Rush to hospital with stroke unit. Time is critical - every minute matters!',
    emergency: true
  },
  'Severe Breathing Difficulty': {
    keywords: ['difficulty breathing', 'can\'t breathe', 'severe asthma', 'choking', 'শ্বাসকষ্ট', 'শ্বাস নিতে পারছে না', 'গলায় কিছু আটকে গেছে'],
    severity: 'High',
    description: 'Acute Respiratory Distress',
    medicines: [],
    instructions: '🚨 RED ALERT: Keep patient upright/sitting. Loosen tight clothing. If asthma, use inhaler if available. Call emergency services immediately. Rush to hospital.',
    emergency: true
  },
  'Severe Bleeding': {
    keywords: ['severe bleeding', 'heavy bleeding', 'blood loss', 'রক্তক্ষরণ', 'অতিরিক্ত রক্ত পড়ছে'],
    severity: 'High',
    description: 'Hemorrhage / Severe Blood Loss',
    medicines: [],
    instructions: '🚨 RED ALERT: Apply direct pressure on wound with clean cloth. Keep patient lying down. Elevate injured area above heart. Call 999 and rush to hospital.',
    emergency: true
  },
  'Unconsciousness': {
    keywords: ['unconscious', 'fainted', 'not responding', 'collapsed', 'অজ্ঞান', 'জ্ঞান হারিয়েছে', 'সাড়া দিচ্ছে না'],
    severity: 'High',
    description: 'Loss of Consciousness - Multiple causes possible',
    medicines: [],
    instructions: '🚨 RED ALERT: Check breathing and pulse. Place in recovery position. Do NOT give food/water. Call 999 immediately. Rush to hospital.',
    emergency: true
  },
  'Seizure': {
    keywords: ['seizure', 'convulsion', 'fits', 'epilepsy attack', 'খিঁচুনি', 'মৃগী রোগ'],
    severity: 'High',
    description: 'Seizure / Convulsions',
    medicines: [],
    instructions: '🚨 RED ALERT: Clear area around patient. Do NOT put anything in mouth. Time the seizure. Turn patient to side. Call emergency services. If seizure lasts > 5 min, rush to hospital.',
    emergency: true
  },
  'Severe Poisoning': {
    keywords: ['poisoning', 'poison', 'toxic', 'বিষ', 'বিষক্রিয়া', 'বিষ খেয়েছে'],
    severity: 'High',
    description: 'Suspected Poisoning / Toxic Ingestion',
    medicines: [],
    instructions: '🚨 RED ALERT: Do NOT induce vomiting. Try to identify the poison/substance. Call Poison Control / 999. Rush to hospital immediately with the poison container if possible.',
    emergency: true
  },
  'Severe Burns': {
    keywords: ['severe burn', 'burn injury', 'scalding', 'পুড়ে গেছে', 'আগুনে পুড়েছে'],
    severity: 'High',
    description: 'Severe Burn Injury',
    medicines: [],
    instructions: '🚨 RED ALERT: Cool burn under running water for 20 minutes. Do NOT apply ice, butter or toothpaste. Cover loosely with clean cloth. Rush to hospital burn unit.',
    emergency: true
  },
  'High Fever Critical': {
    keywords: [],
    severity: 'High',
    temperatureThreshold: 104,
    description: 'Dangerously High Fever (>104°F / 40°C)',
    medicines: [],
    instructions: '🚨 RED ALERT: Apply cool damp cloths. Give Paracetamol if conscious. Do NOT use ice water. Rush to hospital immediately. Possible serious infection or meningitis.',
    emergency: true
  },

  // === MEDIUM RISK DISEASES ===
  'Fever (Moderate)': {
    keywords: ['fever', 'high temperature', 'জ্বর', 'শরীর গরম', 'তাপমাত্রা বেশি'],
    severity: 'Medium',
    temperatureRange: [100, 103],
    description: 'Moderate Fever - Possible viral/bacterial infection',
    medicines: [
      { name: 'Paracetamol (Napa/Ace) 500mg', dosage: '1 tablet', frequency: 'Every 6 hours', duration: '3-5 days' },
      { name: 'ORS (Oral Rehydration Salt)', dosage: '1 sachet in 1 liter water', frequency: 'Sip frequently', duration: 'Until fever subsides' }
    ],
    instructions: 'Forward to Medical Expert for evaluation. Stay hydrated. Rest. Monitor temperature every 4 hours. If fever exceeds 103°F or lasts > 3 days, seek emergency care.',
    forwardToExpert: true
  },
  'Dengue Suspected': {
    keywords: ['dengue', 'body pain with fever', 'joint pain fever', 'eye pain fever', 'ডেঙ্গু', 'হাড়ে ব্যথা জ্বর', 'চোখে ব্যথা জ্বর', 'platelet'],
    severity: 'Medium',
    description: 'Suspected Dengue Fever',
    medicines: [
      { name: 'Paracetamol (Napa) 500mg', dosage: '1 tablet', frequency: 'Every 6 hours', duration: '5 days' },
      { name: 'ORS (Oral Rehydration Salt)', dosage: '1 sachet in 1 liter water', frequency: 'Drink throughout day', duration: 'Until recovery' }
    ],
    instructions: 'Forward to Medical Expert URGENTLY. Do NOT take Aspirin or Ibuprofen. Drink plenty of fluids. Monitor platelet count. Blood test needed within 24 hours.',
    forwardToExpert: true
  },
  'Pneumonia Suspected': {
    keywords: ['pneumonia', 'chest congestion with fever', 'cough with blood', 'নিউমোনিয়া', 'বুকে কফ জমে', 'কাশির সাথে রক্ত'],
    severity: 'Medium',
    description: 'Suspected Pneumonia / Lower Respiratory Infection',
    medicines: [
      { name: 'Paracetamol 500mg', dosage: '1 tablet', frequency: 'Every 6 hours', duration: '5 days' },
      { name: 'Antibiotic (to be prescribed by expert)', dosage: 'As directed', frequency: 'As directed', duration: 'As directed' }
    ],
    instructions: 'Forward to Medical Expert immediately. Chest X-ray needed. Keep patient propped up. Ensure good hydration. Antibiotic course must be completed.',
    forwardToExpert: true
  },
  'Gastroenteritis': {
    keywords: ['vomiting', 'diarrhea', 'stomach infection', 'food poisoning', 'বমি', 'ডায়রিয়া', 'পেটের অসুখ', 'ফুড পয়জনিং', 'loose motion'],
    severity: 'Medium',
    description: 'Gastroenteritis / Food Poisoning',
    medicines: [
      { name: 'ORS (Oral Rehydration Salt)', dosage: '1 sachet in 1 liter water', frequency: 'After each loose stool', duration: 'Until recovery' },
      { name: 'Zinc Tablet 20mg', dosage: '1 tablet', frequency: 'Once daily', duration: '10-14 days' },
      { name: 'Domperidone (Omidon) 10mg', dosage: '1 tablet', frequency: 'Before meals, 3 times', duration: '3 days' }
    ],
    instructions: 'Forward to Medical Expert for evaluation. Keep hydrated with ORS. BRAT diet (Banana, Rice, Applesauce, Toast). If blood in stool or > 6 hours without urination, go to hospital.',
    forwardToExpert: true
  },
  'Typhoid Suspected': {
    keywords: ['typhoid', 'prolonged fever', 'headache with fever', 'টাইফয়েড', 'দীর্ঘদিন জ্বর'],
    severity: 'Medium',
    description: 'Suspected Typhoid Fever',
    medicines: [
      { name: 'Paracetamol 500mg', dosage: '1 tablet', frequency: 'Every 6 hours', duration: 'Until fever subsides' }
    ],
    instructions: 'Forward to Medical Expert. Widal test or blood culture needed. Do not self-medicate with antibiotics. Boild water before drinking.',
    forwardToExpert: true
  },
  'Urinary Tract Infection': {
    keywords: ['burning urination', 'frequent urination', 'UTI', 'প্রস্রাবে জ্বালা', 'ঘন ঘন প্রস্রাব', 'পেশাবে সমস্যা'],
    severity: 'Medium',
    description: 'Suspected Urinary Tract Infection (UTI)',
    medicines: [
      { name: 'Plenty of Water', dosage: '3-4 liters', frequency: 'Throughout day', duration: 'Daily' }
    ],
    instructions: 'Forward to Medical Expert. Urine test needed. Drink plenty of water. Antibiotic course will be prescribed after test results.',
    forwardToExpert: true
  },
  'Asthma Attack': {
    keywords: ['asthma', 'wheezing', 'asthma attack', 'হাঁপানি', 'শ্বাসকষ্ট', 'বুকে সাঁই সাঁই শব্দ'],
    severity: 'Medium',
    description: 'Asthma Exacerbation',
    medicines: [
      { name: 'Salbutamol Inhaler (if prescribed)', dosage: '2 puffs', frequency: 'Every 4-6 hours as needed', duration: 'Until relief' }
    ],
    instructions: 'Forward to Medical Expert. Use rescue inhaler if available. Sit upright. Stay calm. Avoid triggers. If not improving in 15 minutes, go to hospital.',
    forwardToExpert: true
  },
  'Diabetes Concern': {
    keywords: ['diabetes', 'high sugar', 'frequent thirst', 'ডায়াবেটিস', 'সুগার বেশি', 'ঘন ঘন পিপাসা', 'চিনি বেশি'],
    severity: 'Medium',
    description: 'Blood Sugar Management / Diabetes Concern',
    medicines: [],
    instructions: 'Forward to Medical Expert. Blood sugar test needed (fasting & after meal). Follow prescribed diet. Regular monitoring required.',
    forwardToExpert: true
  },

  // === LOW RISK DISEASES ===
  'Common Cold': {
    keywords: ['cold', 'runny nose', 'sneezing', 'nasal congestion', 'সর্দি', 'নাক দিয়ে পানি পড়া', 'হাঁচি', 'নাক বন্ধ'],
    severity: 'Low',
    description: 'Common Cold / Upper Respiratory Infection',
    medicines: [
      { name: 'Paracetamol (Napa/Ace) 500mg', dosage: '1 tablet', frequency: 'Every 6-8 hours (if fever)', duration: '3 days' },
      { name: 'Fexofenadine (Fexo) 120mg', dosage: '1 tablet', frequency: 'Once daily', duration: '5 days' },
      { name: 'Menthol Steam Inhalation', dosage: 'Bowl of hot water + menthol', frequency: 'Twice daily', duration: '3-5 days' },
      { name: 'Warm Water with Honey & Lemon', dosage: '1 cup', frequency: '3 times daily', duration: 'Until better' }
    ],
    instructions: 'Rest at home. Drink warm fluids. Honey with warm water soothes throat. Steam inhalation helps congestion. Wash hands frequently. Usually resolves in 5-7 days.'
  },
  'Cough': {
    keywords: ['cough', 'dry cough', 'productive cough', 'কাশি', 'শুকনো কাশি', 'কফ'],
    severity: 'Low',
    description: 'Acute Cough / Bronchitis',
    medicines: [
      { name: 'Dextromethorphan Syrup (Tuskof)', dosage: '10ml', frequency: '3 times daily', duration: '5 days' },
      { name: 'Warm Water with Honey', dosage: '1 tablespoon honey in warm water', frequency: '3 times daily', duration: 'Until better' },
      { name: 'Lozenges (Strepsils)', dosage: '1 lozenge', frequency: 'Every 3-4 hours', duration: 'As needed' }
    ],
    instructions: 'Rest. Drink warm fluids. Avoid cold drinks and dusty areas. Honey soothes the throat. If cough persists > 2 weeks or has blood, see a doctor.'
  },
  'Headache': {
    keywords: ['headache', 'head pain', 'migraine', 'মাথা ব্যথা', 'মাথা ধরেছে', 'মাইগ্রেন'],
    severity: 'Low',
    description: 'Tension Headache / Mild Migraine',
    medicines: [
      { name: 'Paracetamol (Napa) 500mg', dosage: '1-2 tablets', frequency: 'Every 6 hours as needed', duration: '1-2 days' },
      { name: 'Adequate Water Intake', dosage: '8-10 glasses', frequency: 'Throughout the day', duration: 'Daily' }
    ],
    instructions: 'Rest in a quiet, dark room. Stay hydrated. Apply cool cloth to forehead. Avoid screen time. If headache is sudden and severe ("worst headache ever"), go to hospital immediately.'
  },
  'Body Pain / Muscle Ache': {
    keywords: ['body pain', 'muscle pain', 'joint pain', 'back pain', 'শরীর ব্যথা', 'মাংসপেশি ব্যথা', 'কোমর ব্যথা', 'গায়ে ব্যথা'],
    severity: 'Low',
    description: 'General Body Pain / Myalgia',
    medicines: [
      { name: 'Paracetamol 500mg', dosage: '1 tablet', frequency: 'Every 6-8 hours', duration: '3 days' },
      { name: 'Diclofenac Gel (Voltalin)', dosage: 'Apply thin layer', frequency: '3 times daily', duration: '5 days' },
      { name: 'Hot Compress', dosage: 'Warm towel on affected area', frequency: '15 min, 3 times daily', duration: '5 days' }
    ],
    instructions: 'Rest the affected area. Light stretching exercises. Apply hot compress. Avoid heavy lifting. If pain persists > 1 week, consult doctor.'
  },
  'Mild Allergy / Skin Rash': {
    keywords: ['allergy', 'rash', 'itching', 'hives', 'skin irritation', 'এলার্জি', 'চুলকানি', 'ফুসকুড়ি', 'ত্বকে র্যাশ'],
    severity: 'Low',
    description: 'Allergic Reaction / Skin Rash (Mild)',
    medicines: [
      { name: 'Fexofenadine (Fexo) 120mg', dosage: '1 tablet', frequency: 'Once daily', duration: '5-7 days' },
      { name: 'Calamine Lotion', dosage: 'Apply thin layer', frequency: '2-3 times daily', duration: 'Until resolved' },
      { name: 'Cetirizine (Alatrol) 10mg', dosage: '1 tablet at night', frequency: 'Once daily', duration: '5 days' }
    ],
    instructions: 'Avoid the allergen/trigger. Do not scratch. Keep area clean and dry. Cool compress helps itching. If swelling of face/lips or breathing difficulty, go to hospital immediately.'
  },
  'Mild Stomach Pain': {
    keywords: ['stomach pain', 'gastric', 'acidity', 'indigestion', 'bloating', 'পেট ব্যথা', 'গ্যাস্ট্রিক', 'বদহজম', 'পেট ফোলা'],
    severity: 'Low',
    description: 'Dyspepsia / Gastric Pain / Indigestion',
    medicines: [
      { name: 'Omeprazole (Seclo) 20mg', dosage: '1 capsule', frequency: 'Before breakfast', duration: '7-14 days' },
      { name: 'Antacid Suspension (Gaviscon/Mucaine)', dosage: '10ml', frequency: 'After meals and bedtime', duration: '7 days' },
      { name: 'Simethicone (Flatuna)', dosage: '1 tablet', frequency: 'After meals', duration: 'As needed' }
    ],
    instructions: 'Eat small meals. Avoid spicy, oily and fried food. Don\'t lie down immediately after eating. Drink water regularly. Avoid tea/coffee on empty stomach.'
  },
  'Minor Wound / Cut': {
    keywords: ['wound', 'cut', 'scratch', 'minor injury', 'কেটে গেছে', 'ক্ষত', 'ছিড়ে গেছে', 'আঘাত'],
    severity: 'Low',
    description: 'Minor Wound / Cut',
    medicines: [
      { name: 'Povidone-Iodine (Betadine)', dosage: 'Apply on wound', frequency: 'Twice daily', duration: 'Until healed' },
      { name: 'Sterile Bandage', dosage: 'Cover wound after cleaning', frequency: 'Change twice daily', duration: 'Until healed' },
      { name: 'Paracetamol 500mg (for pain)', dosage: '1 tablet', frequency: 'Every 6 hours if pain', duration: '2-3 days' }
    ],
    instructions: 'Clean wound with clean water. Apply antiseptic. Cover with sterile bandage. Keep dry. If wound is deep, has pus, or tetanus shot not up to date, see a doctor.'
  },
  'Sore Throat': {
    keywords: ['sore throat', 'throat pain', 'difficulty swallowing', 'গলা ব্যথা', 'গলা ফুলেছে', 'গিলতে কষ্ট'],
    severity: 'Low',
    description: 'Pharyngitis / Sore Throat',
    medicines: [
      { name: 'Warm Salt Water Gargle', dosage: '1/2 tsp salt in warm water', frequency: 'Every 3-4 hours', duration: 'Until better' },
      { name: 'Paracetamol 500mg', dosage: '1 tablet', frequency: 'Every 6-8 hours if pain', duration: '3 days' },
      { name: 'Lozenges (Strepsils)', dosage: '1 lozenge', frequency: 'Every 3-4 hours', duration: 'As needed' }
    ],
    instructions: 'Gargle with warm salt water. Drink warm fluids. Avoid cold drinks. Rest your voice. If sore throat lasts > 5 days or white patches appear, see a doctor.'
  },
  'Eye Irritation': {
    keywords: ['eye pain', 'red eye', 'eye irritation', 'watery eyes', 'চোখ লাল', 'চোখ ব্যথা', 'চোখ দিয়ে পানি পড়া', 'চোখ জ্বালা'],
    severity: 'Low',
    description: 'Conjunctivitis / Eye Irritation',
    medicines: [
      { name: 'Clean Water Eye Wash', dosage: 'Wash eyes gently', frequency: '3-4 times daily', duration: 'Until better' },
      { name: 'Artificial Tears Eye Drops', dosage: '1-2 drops', frequency: '4 times daily', duration: '5 days' }
    ],
    instructions: 'Wash hands before touching eyes. Clean eyes with cool water. Do not share towels. Avoid rubbing eyes. If vision changes or severe swelling, see a doctor.'
  },
  'Mild Dehydration': {
    keywords: ['dehydration', 'dry mouth', 'thirsty', 'পানিশূন্যতা', 'মুখ শুকিয়ে যাচ্ছে', 'পিপাসা'],
    severity: 'Low',
    description: 'Mild Dehydration',
    medicines: [
      { name: 'ORS (Oral Rehydration Salt)', dosage: '1 sachet in 1 liter water', frequency: 'Sip throughout day', duration: 'Until hydrated' },
      { name: 'Coconut Water', dosage: '1-2 glasses', frequency: 'Twice daily', duration: '3 days' }
    ],
    instructions: 'Drink ORS solution. Drink water frequently. Eat fruits with water content (watermelon, cucumber). Rest in cool place. Avoid direct sunlight.'
  }
}

// =====================================================
// AI Diagnosis Engine
// =====================================================
const diagnoseDisease = (symptoms, temperature, bloodPressure) => {
  const symptomsLower = symptoms.toLowerCase()
  const matchedDiseases = []

  // Check each disease for keyword matches
  for (const [diseaseName, disease] of Object.entries(DISEASE_DATABASE)) {
    let score = 0

    // Check keyword matches
    for (const keyword of disease.keywords) {
      if (symptomsLower.includes(keyword.toLowerCase())) {
        score += 1
      }
    }

    // Check temperature thresholds
    if (disease.temperatureThreshold && temperature >= disease.temperatureThreshold) {
      score += 2
    }
    if (disease.temperatureRange && temperature >= disease.temperatureRange[0] && temperature <= disease.temperatureRange[1]) {
      score += 1
    }

    if (score > 0) {
      matchedDiseases.push({
        name: diseaseName,
        ...disease,
        score
      })
    }
  }

  // Sort by score and severity priority
  const severityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 }
  matchedDiseases.sort((a, b) => {
    if (severityOrder[b.severity] !== severityOrder[a.severity]) {
      return severityOrder[b.severity] - severityOrder[a.severity]
    }
    return b.score - a.score
  })

  // If no matches, check temperature alone
  if (matchedDiseases.length === 0 && temperature) {
    if (temperature >= 104) {
      return {
        riskLevel: 'High',
        detectedDisease: 'High Fever Critical',
        description: 'Dangerously High Fever (>104°F)',
        aiRecommendation: '🚨 RED ALERT: Dangerously high fever detected. Rush to hospital immediately!',
        suggestedMedicines: [],
        instructions: 'Apply cool damp cloths. Give Paracetamol if conscious. Rush to hospital.',
        emergency: true,
        forwardToExpert: false
      }
    } else if (temperature >= 100) {
      return {
        riskLevel: 'Medium',
        detectedDisease: 'Fever (Moderate)',
        description: 'Moderate Fever - Needs medical evaluation',
        aiRecommendation: 'Moderate fever detected. Forwarding to Medical Expert for evaluation.',
        suggestedMedicines: [
          { name: 'Paracetamol 500mg', dosage: '1 tablet', frequency: 'Every 6 hours', duration: '3-5 days' },
          { name: 'ORS', dosage: '1 sachet in 1L water', frequency: 'Sip frequently', duration: 'Until better' }
        ],
        instructions: 'Rest. Stay hydrated. Monitor temperature.',
        emergency: false,
        forwardToExpert: true
      }
    }
  }

  // If still no matches
  if (matchedDiseases.length === 0) {
    return {
      riskLevel: 'Low',
      detectedDisease: 'General Health Concern',
      description: 'No specific disease pattern detected',
      aiRecommendation: 'Symptoms noted. Rest and stay hydrated. Monitor your condition. If symptoms worsen, seek medical attention.',
      suggestedMedicines: [
        { name: 'Paracetamol 500mg (if pain)', dosage: '1 tablet', frequency: 'Every 6-8 hours as needed', duration: '2-3 days' }
      ],
      instructions: 'Rest at home. Drink plenty of water. Eat nutritious food. If symptoms persist > 3 days, consult a doctor.',
      emergency: false,
      forwardToExpert: false
    }
  }

  // Take the top match
  const topMatch = matchedDiseases[0]

  let recommendation = ''
  if (topMatch.severity === 'High') {
    recommendation = `🚨 RED ALERT - ${topMatch.name} DETECTED!\n${topMatch.description}\n\n⚡ EMERGENCY: ${topMatch.instructions}\n\n🏥 Patient MUST be taken to hospital/medical expert IMMEDIATELY!`
  } else if (topMatch.severity === 'Medium') {
    recommendation = `⚠️ ${topMatch.name} Detected\n${topMatch.description}\n\n📋 Patient forwarded to Medical Expert for detailed evaluation.\n\n💊 Preliminary Care:\n${topMatch.instructions}`
  } else {
    recommendation = `✅ ${topMatch.name} Detected\n${topMatch.description}\n\n💊 Suggested Treatment:\n${topMatch.instructions}`
  }

  return {
    riskLevel: topMatch.severity,
    detectedDisease: topMatch.name,
    description: topMatch.description,
    aiRecommendation: recommendation,
    suggestedMedicines: topMatch.medicines || [],
    instructions: topMatch.instructions,
    emergency: topMatch.emergency || false,
    forwardToExpert: topMatch.forwardToExpert || false,
    allMatches: matchedDiseases.slice(0, 3).map(d => ({
      name: d.name,
      severity: d.severity,
      score: d.score,
      description: d.description
    }))
  }
}

// Generate consultation ID
const generateConsultationId = () => {
  const randomNum = Math.floor(100000 + Math.random() * 900000) // 6 digit number
  return `C-${randomNum}`
}

// 1. Create Consultation - POST /api/consultations
// Accessible by rural-medical-worker only
export const createConsultation = async (req, res) => {
  try {
    const { patientId, symptoms, temperature, voiceInputText, consultationDate } = req.body

    // Handle blood pressure — can come as JSON object or separate fields (multipart form)
    let bloodPressure = { systolic: null, diastolic: null }
    if (req.body.bloodPressure && typeof req.body.bloodPressure === 'object') {
      bloodPressure = req.body.bloodPressure
    } else if (req.body.bloodPressureSystolic) {
      bloodPressure = {
        systolic: parseInt(req.body.bloodPressureSystolic) || null,
        diastolic: parseInt(req.body.bloodPressureDiastolic) || null
      }
    }

    // Validation
    if (!patientId || !symptoms) {
      return res.status(400).json({ message: 'Patient ID and symptoms are required' })
    }

    // Find patient by patientId string
    const patient = await Patient.findOne({ patientId })
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' })
    }

    // Run AI Diagnosis using Google Gemini (with optional document)
    const temp = temperature || 98.6
    const bp = bloodPressure || { systolic: null, diastolic: null }
    const filePath = req.file ? req.file.path : null
    const mimeType = req.file ? req.file.mimetype : null
    const diagnosis = await diagnoseWithDocument(symptoms, temp, bp, filePath, mimeType)

    // Determine status based on severity
    let status = 'Pending Review'
    if (diagnosis.riskLevel === 'High') {
      status = 'Escalated'
    }

    // Create consultation
    const consultation = new Consultation({
      consultationId: generateConsultationId(),
      patientId: patient._id,
      recordedBy: req.user.userId,
      symptoms,
      voiceInputText: voiceInputText || '',
      temperature: temp,
      bloodPressure: bp,
      otherVitals: req.body.otherVitals || {},
      consultationDate: consultationDate || new Date(),
      riskLevel: diagnosis.riskLevel,
      aiRecommendation: diagnosis.aiRecommendation,
      detectedDisease: diagnosis.detectedDisease,
      diseaseDescription: diagnosis.description,
      suggestedMedicines: diagnosis.suggestedMedicines || [],
      aiInstructions: diagnosis.instructions,
      isEmergency: diagnosis.emergency || false,
      forwardedToExpert: diagnosis.forwardToExpert || diagnosis.emergency || false,
      documentPath: req.file ? `/uploads/${req.file.filename}` : '',
      documentOriginalName: req.file ? req.file.originalname : '',
      documentMimeType: req.file ? req.file.mimetype : '',
      status
    })

    await consultation.save()

    // Add consultation reference to patient
    patient.consultations.push(consultation._id)
    
    // If Low risk with medicine suggestions, add to patient medications
    if (diagnosis.riskLevel === 'Low' && diagnosis.suggestedMedicines.length > 0) {
      const newMeds = diagnosis.suggestedMedicines.map(m => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        startDate: new Date()
      }))
      patient.medications = patient.medications.concat(newMeds)
    }
    
    await patient.save()

    return res.status(201).json({
      message: 'Consultation created successfully',
      consultation: {
        id: consultation._id,
        consultationId: consultation.consultationId,
        patientId: patient.patientId,
        patientName: patient.name,
        symptoms: consultation.symptoms,
        temperature: consultation.temperature,
        bloodPressure: consultation.bloodPressure,
        riskLevel: consultation.riskLevel,
        aiRecommendation: consultation.aiRecommendation,
        detectedDisease: consultation.detectedDisease,
        diseaseDescription: consultation.diseaseDescription,
        suggestedMedicines: consultation.suggestedMedicines,
        aiInstructions: consultation.aiInstructions,
        isEmergency: consultation.isEmergency,
        forwardedToExpert: consultation.forwardedToExpert,
        status: consultation.status,
        consultationDate: consultation.consultationDate
      }
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

// 2. Get Consultations by Patient - GET /api/consultations/patient/:patientId
export const getConsultationsByPatient = async (req, res) => {
  try {
    const { patientId } = req.params

    // Find patient by patientId string
    const patient = await Patient.findOne({ patientId })
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' })
    }

    // Get consultations for this patient
    const consultations = await Consultation.find({ patientId: patient._id })
      .populate('recordedBy', 'fullName role')
      .populate('expertId', 'fullName role')
      .sort({ consultationDate: -1 })

    return res.status(200).json({
      patientId: patient.patientId,
      patientName: patient.name,
      consultations
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

// 3. Get Pending Consultations - GET /api/consultations/pending
// Only for medical-expert role
export const getPendingConsultations = async (req, res) => {
  try {
    const consultations = await Consultation.find({ 
      status: { $in: ['Pending Review', 'Escalated'] }
    })
      .populate('patientId', 'name age gender contact patientId')
      .populate('recordedBy', 'fullName role')
      .sort({ 
        isEmergency: -1,  // Emergency first
        riskLevel: -1,     // Then by risk level
        consultationDate: -1 
      })

    return res.status(200).json({
      count: consultations.length,
      consultations
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

// 4. Review Consultation - PUT /api/consultations/:id
// Only for medical-expert role
export const reviewConsultation = async (req, res) => {
  try {
    const { id } = req.params
    const { expertReview, updatedRiskLevel, medications, followUpInstructions } = req.body

    // Find consultation
    const consultation = await Consultation.findById(id)
    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found' })
    }

    // Check if already reviewed
    if (consultation.status !== 'Pending Review') {
      return res.status(400).json({ message: 'Consultation already reviewed' })
    }

    // Update consultation
    consultation.expertReview = expertReview || ''
    consultation.expertId = req.user.userId
    consultation.status = 'Reviewed'
    
    if (updatedRiskLevel) {
      consultation.riskLevel = updatedRiskLevel
    }

    await consultation.save()

    // Update patient medications and follow-ups if provided
    const patient = await Patient.findById(consultation.patientId)
    if (patient) {
      if (medications && medications.length > 0) {
        patient.medications = patient.medications.concat(medications)
      }
      
      if (followUpInstructions) {
        patient.followUps.push({
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
          notes: followUpInstructions,
          status: 'Scheduled'
        })
      }
      
      await patient.save()
    }

    return res.status(200).json({
      message: 'Consultation reviewed successfully',
      consultation: {
        id: consultation._id,
        consultationId: consultation.consultationId,
        riskLevel: consultation.riskLevel,
        expertReview: consultation.expertReview,
        status: consultation.status,
        reviewedBy: req.user.userId
      }
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

// Get all consultations (for admin/health-authority)
export const getAllConsultations = async (req, res) => {
  try {
    const { status, riskLevel, limit = 50 } = req.query
    
    const filter = {}
    if (status) filter.status = status
    if (riskLevel) filter.riskLevel = riskLevel

    const consultations = await Consultation.find(filter)
      .populate('patientId', 'name age gender contact patientId')
      .populate('recordedBy', 'fullName role')
      .populate('expertId', 'fullName role')
      .sort({ consultationDate: -1 })
      .limit(parseInt(limit))

    return res.status(200).json({
      count: consultations.length,
      consultations
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

// Get consultations recorded by current user (RMW)
export const getMyConsultations = async (req, res) => {
  try {
    const userId = req.user.userId

    const consultations = await Consultation.find({ recordedBy: userId })
      .populate('patientId', 'name age gender contact patientId')
      .populate('expertId', 'fullName role')
      .sort({ consultationDate: -1 })

    return res.status(200).json({
      count: consultations.length,
      consultations
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

