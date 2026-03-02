import { GoogleGenerativeAI } from '@google/generative-ai'
import { config } from '../config.js'
import fs from 'fs'

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(config.geminiApiKey)

// System prompt for medical diagnosis
const SYSTEM_PROMPT = `তুমি একজন অভিজ্ঞ AI মেডিকেল অ্যাসিস্ট্যান্ট। তোমার কাজ হলো রোগীর লক্ষণ (symptoms) বিশ্লেষণ করে রোগ নির্ণয় করা এবং পরামর্শ দেওয়া।

তুমি বাংলা ও ইংরেজি দুটো ভাষাই বোঝো। রোগী বা স্বাস্থ্যকর্মী যেকোনো ভাষায় লক্ষণ বলতে পারে।

তোমাকে অবশ্যই নিচের JSON format-এ উত্তর দিতে হবে (অন্য কিছু লেখা যাবে না, শুধু JSON):

{
  "detectedDisease": "রোগের নাম (বাংলা ও ইংরেজি)",
  "severity": "Low" অথবা "Medium" অথবা "High",
  "description": "রোগের সংক্ষিপ্ত বিবরণ বাংলায়",
  "medicines": [
    {
      "name": "ওষুধের নাম (বাংলা/ইংরেজি উভয়)",
      "dosage": "মাত্রা",
      "frequency": "কতবার খাবে",
      "duration": "কতদিন"
    }
  ],
  "instructions": "বাংলায় বিস্তারিত নির্দেশনা - কি করতে হবে, কি করা যাবে না, কখন ডাক্তারের কাছে যেতে হবে",
  "emergency": true/false,
  "forwardToExpert": true/false,
  "aiRecommendation": "পূর্ণ পরামর্শ বাংলায় (বিস্তারিত, যেমন ChatGPT দেয় তেমন সুন্দর করে)"
}

গুরুত্বপূর্ণ নিয়ম:
1. **severity নির্ধারণ:**
   - "High" = জরুরি, জীবন ঝুঁকিতে (হার্ট অ্যাটাক, স্ট্রোক, তীব্র রক্তক্ষরণ, অজ্ঞান, বিষ খাওয়া, কোনো কিছু গিলে ফেলা যা বিপদজনক হতে পারে) → emergency: true, forwardToExpert: true, medicines should be empty [] (ডাক্তার ছাড়া ওষুধ দেবে না)
   - "Medium" = মাঝারি ঝুঁকি, ডাক্তার দেখানো দরকার (ডেঙ্গু, নিউমোনিয়া, টাইফয়েড ইত্যাদি) → forwardToExpert: true, কিছু প্রাথমিক ওষুধ দেওয়া যেতে পারে
   - "Low" = হালকা সমস্যা, ঘরে চিকিৎসা সম্ভব (সর্দি, গ্যাস, হালকা জ্বর) → forwardToExpert: false, ওষুধ ও পরামর্শ দাও

2. **medicines এ বাংলাদেশে সহজলভ্য ওষুধের নাম দাও** (যেমন: নাপা/এস, ফ্লাগাইল, ওরস্যালাইন, মেট্রোনিডাজল ইত্যাদি)

3. **instructions বাংলায় লেখো**, সহজ ভাষায় যাতে গ্রামের মানুষ বুঝতে পারে

4. **aiRecommendation হবে বিস্তারিত** - ChatGPT-এর মত সুন্দর করে পরামর্শ দাও। কী হয়েছে, কেন হয়েছে, কী করতে হবে, কখন ডাক্তার লাগবে - সব বাংলায়

5. **অদ্ভুত/অস্বাভাবিক কেস** (যেমন কেউ মার্বেল/কয়েন গিলে ফেলেছে, পোকায় কামড়েছে ইত্যাদি) - এগুলোও ঠিকভাবে হ্যান্ডেল করো। practical পরামর্শ দাও।

6. তাপমাত্রা (temperature) ও রক্তচাপ (blood pressure) দেওয়া থাকলে সেটাও বিশ্লেষণে ব্যবহার করো।

শুধুমাত্র JSON দাও, অন্য কোনো টেক্সট দিও না।`

/**
 * AI-powered disease diagnosis using Google Gemini
 * @param {string} symptoms - Patient symptoms (can be in Bangla or English)
 * @param {number} temperature - Body temperature in Fahrenheit
 * @param {object} bloodPressure - { systolic, diastolic }
 * @returns {object} Diagnosis result
 */
export async function diagnoseWithAI(symptoms, temperature, bloodPressure) {
  return diagnoseWithDocument(symptoms, temperature, bloodPressure, null, null)
}

/**
 * AI-powered diagnosis with optional document/image analysis
 * @param {string} symptoms
 * @param {number} temperature
 * @param {object} bloodPressure
 * @param {string|null} filePath - Absolute path to the uploaded file
 * @param {string|null} mimeType - MIME type of the file
 */
export async function diagnoseWithDocument(symptoms, temperature, bloodPressure, filePath, mimeType) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    // Build the text prompt
    let userPrompt = `রোগীর লক্ষণ: ${symptoms || '(কোনো লক্ষণ উল্লেখ করা হয়নি)'}`

    if (temperature && temperature !== 98.6) {
      userPrompt += `\nতাপমাত্রা: ${temperature}°F`
    }

    if (bloodPressure && bloodPressure.systolic) {
      userPrompt += `\nরক্তচাপ: ${bloodPressure.systolic}/${bloodPressure.diastolic} mmHg`
    }

    if (filePath) {
      userPrompt += `\n\n📎 রোগীর একটি ডকুমেন্ট/ছবি আপলোড করা হয়েছে। ছবিটি বিশ্লেষণ করে রোগ নির্ণয়ে সাহায্য করো।`
    }

    userPrompt += '\n\nউপরের তথ্য বিশ্লেষণ করে রোগ নির্ণয় করো এবং নির্ধারিত JSON format-এ উত্তর দাও।'

    // Build parts array — include image if provided
    const parts = [{ text: SYSTEM_PROMPT + '\n\n---\n\n' + userPrompt }]

    if (filePath && fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath)
      const base64Data = fileData.toString('base64')
      const imageMime = mimeType || 'image/jpeg'

      // Gemini supports: image/jpeg, image/png, image/gif, image/webp, application/pdf
      parts.push({
        inlineData: {
          mimeType: imageMime,
          data: base64Data
        }
      })
    }

    // Call Gemini AI
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts
        }
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json'
      }
    })

    const response = result.response
    const text = response.text()

    // Parse JSON from response
    let diagnosis
    try {
      // Try direct parse first
      diagnosis = JSON.parse(text)
    } catch {
      // Try to extract JSON from markdown code block
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        diagnosis = JSON.parse(jsonMatch[1].trim())
      } else {
        // Try to find JSON object in text
        const jsonStart = text.indexOf('{')
        const jsonEnd = text.lastIndexOf('}')
        if (jsonStart !== -1 && jsonEnd !== -1) {
          diagnosis = JSON.parse(text.substring(jsonStart, jsonEnd + 1))
        } else {
          throw new Error('Could not parse AI response as JSON')
        }
      }
    }

    // Validate and normalize the response
    const severity = ['High', 'Medium', 'Low'].includes(diagnosis.severity) 
      ? diagnosis.severity 
      : 'Medium'

    const isEmergency = diagnosis.emergency === true || severity === 'High'
    const shouldForward = diagnosis.forwardToExpert === true || severity === 'High' || severity === 'Medium'

    // Build formatted recommendation
    let aiRecommendation = diagnosis.aiRecommendation || ''
    if (!aiRecommendation) {
      if (severity === 'High') {
        aiRecommendation = `🚨 জরুরি সতর্কতা! ${diagnosis.detectedDisease} সনাক্ত হয়েছে।\n${diagnosis.instructions}`
      } else if (severity === 'Medium') {
        aiRecommendation = `⚠️ ${diagnosis.detectedDisease} সনাক্ত হয়েছে।\n${diagnosis.instructions}`
      } else {
        aiRecommendation = `✅ ${diagnosis.detectedDisease} সনাক্ত হয়েছে।\n${diagnosis.instructions}`
      }
    }

    // Normalize medicines format
    const medicines = Array.isArray(diagnosis.medicines) 
      ? diagnosis.medicines.map(m => ({
          name: m.name || 'Unknown',
          dosage: m.dosage || '',
          frequency: m.frequency || '',
          duration: m.duration || ''
        }))
      : []

    // For High severity, no medicines (too dangerous)
    const safeMedicines = severity === 'High' ? [] : medicines

    return {
      success: true,
      riskLevel: severity,
      detectedDisease: diagnosis.detectedDisease || 'Unknown Condition',
      description: diagnosis.description || '',
      aiRecommendation,
      suggestedMedicines: safeMedicines,
      instructions: diagnosis.instructions || '',
      emergency: isEmergency,
      forwardToExpert: shouldForward
    }

  } catch (error) {
    console.error('Gemini AI Error:', error.message)
    console.log('Falling back to local AI diagnosis...')
    
    // Fall back to local keyword-based diagnosis
    return localDiagnose(symptoms, temperature, bloodPressure)
  }
}
// LOCAL AI FALLBACK — keyword-based diagnosis engine
// Used when Gemini API is unavailable
// =====================================================
function localDiagnose(symptoms, temperature, bloodPressure) {
  const symptomsLower = (symptoms || '').toLowerCase()

  const DISEASE_DATABASE = {
    // === HIGH RISK ===
    'Heart Attack / হার্ট অ্যাটাক': {
      keywords: ['chest pain', 'chest tightness', 'left arm pain', 'jaw pain', 'heart attack', 'বুকে ব্যথা', 'বুকে চাপ', 'হার্ট অ্যাটাক', 'হার্ট এটাক'],
      severity: 'High',
      description: 'হার্ট অ্যাটাকের সম্ভাবনা — জরুরি ভিত্তিতে হাসপাতালে যেতে হবে',
      medicines: [],
      instructions: '🚨 জরুরি: এখনই 999 কল করুন। ডাক্তার ছাড়া কোনো ওষুধ দেবেন না। রোগীকে হাঁটাবেন না — শুইয়ে রাখুন। দ্রুত হাসপাতালে নিন।',
      emergency: true
    },
    'Stroke / স্ট্রোক': {
      keywords: ['stroke', 'face drooping', 'arm weakness', 'speech difficulty', 'sudden numbness', 'স্ট্রোক', 'মুখ বাঁকা', 'হাত অবশ', 'কথা জড়িয়ে যাচ্ছে'],
      severity: 'High',
      description: 'স্ট্রোকের সম্ভাবনা — প্রতিটি মিনিট গুরুত্বপূর্ণ',
      medicines: [],
      instructions: '🚨 জরুরি: এখনই 999 কল করুন। লক্ষণ শুরুর সময় নোট করুন। রোগীকে খাবার বা পানি দেবেন না। দ্রুত হাসপাতালে নিন।',
      emergency: true
    },
    'বিষ/কেমিক্যাল খাওয়া (Poisoning)': {
      keywords: ['poison', 'chemical', 'bleach', 'detergent', 'বিষ', 'কেমিক্যাল', 'ব্লিচ', 'ডিটারজেন্ট', 'কীটনাশক', 'pesticide', 'rat poison', 'ইঁদুরের বিষ'],
      severity: 'High',
      description: 'বিষ/রাসায়নিক পদার্থ খাওয়ার সম্ভাবনা — জরুরি',
      medicines: [],
      instructions: '🚨 জরুরি: বমি করানোর চেষ্টা করবেন না! যা খেয়েছে তার প্যাকেট/বোতল নিয়ে আসুন। এখনই হাসপাতালে নিন। 999 কল করুন।',
      emergency: true
    },
    'বড় কিছু গিলে ফেলা (Foreign Body - Dangerous)': {
      keywords: ['swallowed battery', 'swallowed coin', 'swallowed sharp', 'গিলে ফেলেছে', 'খেয়ে ফেলেছে', 'ব্যাটারি গিলে', 'ধারালো কিছু', 'magnet', 'চুম্বক', 'ব্লেড'],
      severity: 'High',
      description: 'বিপজ্জনক বস্তু গিলে ফেলা — ব্যাটারি, ধারালো জিনিস বা চুম্বক অত্যন্ত বিপজ্জনক',
      medicines: [],
      instructions: '🚨 জরুরি: বমি করানোর চেষ্টা করবেন না! কিছু খাওয়াবেন বা পান করাবেন না। এখনই হাসপাতালে নিন — X-ray করাতে হবে। ব্যাটারি বা ধারালো জিনিস ভেতরে পেট ফুটো করতে পারে!',
      emergency: true
    },
    'Severe Breathing Crisis / তীব্র শ্বাসকষ্ট': {
      keywords: ['can\'t breathe', 'severe asthma', 'choking', 'শ্বাস নিতে পারছে না', 'গলায় আটকে', 'দম বন্ধ'],
      severity: 'High',
      description: 'তীব্র শ্বাসকষ্ট — জরুরি চিকিৎসা প্রয়োজন',
      medicines: [],
      instructions: '🚨 জরুরি: রোগীকে সোজা বসিয়ে রাখুন। টাইট কাপড় ঢিলা করুন। Inhaler থাকলে ব্যবহার করুন। 999 কল করুন।',
      emergency: true
    },
    'অজ্ঞান / Unconscious': {
      keywords: ['unconscious', 'fainted', 'not responding', 'collapsed', 'অজ্ঞান', 'জ্ঞান হারিয়েছে', 'সাড়া দিচ্ছে না'],
      severity: 'High',
      description: 'জ্ঞান হারানো — একাধিক কারণ থাকতে পারে',
      medicines: [],
      instructions: '🚨 জরুরি: শ্বাস-প্রশ্বাস ও নাড়ি চেক করুন। পাশ ফিরিয়ে শোয়ান (recovery position)। খাবার/পানি দেবেন না। 999 কল করুন।',
      emergency: true
    },
    'খিঁচুনি / Seizure': {
      keywords: ['seizure', 'convulsion', 'fits', 'খিঁচুনি', 'মৃগী', 'ফিট'],
      severity: 'High',
      description: 'খিঁচুনি/মৃগীরোগের আক্রমণ',
      medicines: [],
      instructions: '🚨 জরুরি: রোগীকে ধরবেন না বা চেপে রাখবেন না। মাথার নিচে নরম কিছু দিন। মুখে কিছু ঢোকাবেন না। ৫ মিনিটের বেশি হলে 999 কল করুন।',
      emergency: true
    },
    'তীব্র রক্তক্ষরণ / Severe Bleeding': {
      keywords: ['severe bleeding', 'heavy bleeding', 'blood loss', 'রক্তক্ষরণ', 'রক্ত বন্ধ হচ্ছে না', 'অতিরিক্ত রক্ত'],
      severity: 'High',
      description: 'তীব্র রক্তক্ষরণ — জরুরি প্রাথমিক চিকিৎসা প্রয়োজন',
      medicines: [],
      instructions: '🚨 জরুরি: পরিষ্কার কাপড় দিয়ে ক্ষতস্থানে চাপ দিন। আহত স্থান হৃদপিণ্ডের ওপরে রাখুন। রোগীকে শোয়ান। 999 কল করুন।',
      emergency: true
    },

    // === MEDIUM RISK ===
    'মার্বেল/ছোট বস্তু গিলে ফেলা (Foreign Body - Small)': {
      keywords: ['marble', 'swallowed marble', 'swallowed small', 'মার্বেল', 'কাঁচের গুটি', 'মার্বেল খেয়ে', 'গুটি গিলে', 'button', 'বোতাম'],
      severity: 'Medium',
      description: 'ছোট গোলাকার বস্তু (মার্বেল/বোতাম) গিলে ফেলা — বেশিরভাগ ক্ষেত্রে স্বাভাবিকভাবে বেরিয়ে যায়, তবে পর্যবেক্ষণ জরুরি',
      medicines: [],
      instructions: 'ভয় পাবেন না — ছোট, মসৃণ মার্বেল সাধারণত ২৪-৪৮ ঘণ্টার মধ্যে পায়খানার সাথে বেরিয়ে যায়।\n\n✅ যা করবেন:\n• স্বাভাবিক খাবার খেতে দিন\n• প্রচুর পানি খাওয়ান\n• পায়খানায় মার্বেল বের হয় কিনা লক্ষ্য রাখুন\n• ২৪-৪৮ ঘণ্টা পর্যবেক্ষণ করুন\n\n🚨 যখন জরুরি হবে — এই লক্ষণ দেখলে সাথে সাথে হাসপাতালে যান:\n• পেটে তীব্র ব্যথা\n• বমি হচ্ছে\n• গিলতে কষ্ট\n• শ্বাসকষ্ট\n• পেট ফুলে যাচ্ছে\n• ২-৩ দিনেও বের হচ্ছে না',
      forwardToExpert: true,
      emergency: false
    },
    'ডেঙ্গু / Dengue': {
      keywords: ['dengue', 'ডেঙ্গু', 'platelet', 'প্লাটিলেট', 'rash with fever', 'জ্বর আর র‍্যাশ', 'joint pain fever'],
      severity: 'Medium',
      description: 'ডেঙ্গু জ্বরের সম্ভাবনা — রক্ত পরীক্ষা জরুরি',
      medicines: [
        { name: 'Paracetamol (নাপা/এস) 500mg', dosage: '১ টি ট্যাবলেট', frequency: 'প্রতি ৬ ঘণ্টায়', duration: '৩-৫ দিন' },
        { name: 'ORS (ওরস্যালাইন)', dosage: '১ প্যাকেট ১ লিটার পানিতে', frequency: 'বারবার চুমুক দিয়ে খান', duration: 'জ্বর থাকা পর্যন্ত' }
      ],
      instructions: '⚠️ ডেঙ্গু সন্দেহ: CBC/প্লাটিলেট রক্ত পরীক্ষা করান। প্রচুর পানি ও তরল খান। Aspirin/Ibuprofen একদম খাবেন না! শুধু Paracetamol খান। প্লাটিলেট কমে গেলে হাসপাতালে ভর্তি হন।',
      forwardToExpert: true,
      emergency: false
    },
    'Pneumonia / নিউমোনিয়া': {
      keywords: ['pneumonia', 'নিউমোনিয়া', 'cough with fever', 'chest infection', 'বুকে সর্দি', 'কাশিতে রক্ত'],
      severity: 'Medium',
      description: 'নিউমোনিয়া/ফুসফুসে সংক্রমণের সম্ভাবনা',
      medicines: [
        { name: 'Paracetamol (নাপা) 500mg', dosage: '১ টি ট্যাবলেট', frequency: 'প্রতি ৬ ঘণ্টায়', duration: '৫ দিন' },
        { name: 'ORS', dosage: '১ প্যাকেট ১ লিটার পানিতে', frequency: 'বারবার', duration: 'সুস্থ না হওয়া পর্যন্ত' }
      ],
      instructions: '⚠️ ডাক্তারের কাছে যান — এন্টিবায়োটিক লাগতে পারে। বুকের X-ray করান। প্রচুর তরল খান। পূর্ণ বিশ্রাম নিন।',
      forwardToExpert: true,
      emergency: false
    },
    'Typhoid / টাইফয়েড': {
      keywords: ['typhoid', 'টাইফয়েড', 'prolonged fever', 'diarrhea fever', 'দীর্ঘদিন জ্বর', 'পেটে ব্যথা জ্বর'],
      severity: 'Medium',
      description: 'টাইফয়েড জ্বরের সম্ভাবনা — রক্ত পরীক্ষা প্রয়োজন',
      medicines: [
        { name: 'Paracetamol 500mg', dosage: '১ টি', frequency: 'প্রতি ৬ ঘণ্টায়', duration: '৫ দিন' },
        { name: 'ORS', dosage: '১ প্যাকেট', frequency: 'ঘন ঘন', duration: 'পানিশূন্যতা না কমা পর্যন্ত' }
      ],
      instructions: '⚠️ Widal/Blood culture পরীক্ষা করান। ফুটানো পানি খান। বাইরের খাবার এড়িয়ে চলুন। পূর্ণ বিশ্রাম নিন। ডাক্তার এন্টিবায়োটিক দেবেন।',
      forwardToExpert: true,
      emergency: false
    },
    'জ্বর (মাঝারি) / Moderate Fever': {
      keywords: ['fever', 'high fever', 'জ্বর', 'তীব্র জ্বর', 'গা গরম', 'শরীর গরম'],
      severity: 'Medium',
      temperatureThreshold: 101,
      description: 'মাঝারি থেকে তীব্র জ্বর — কারণ নির্ণয় প্রয়োজন',
      medicines: [
        { name: 'Paracetamol (নাপা/এস) 500mg', dosage: '১ টি ট্যাবলেট', frequency: 'প্রতি ৬ ঘণ্টায়', duration: '৩-৫ দিন' },
        { name: 'ORS (ওরস্যালাইন)', dosage: '১ প্যাকেট ১ লিটার পানিতে', frequency: 'ঘন ঘন', duration: 'জ্বর কমা পর্যন্ত' }
      ],
      instructions: '⚠️ Medical Expert-এর কাছে পাঠানো হচ্ছে। প্রচুর পানি খান। বিশ্রাম নিন। প্রতি ৪ ঘণ্টায় তাপমাত্রা মাপুন। ১০৩°F এর বেশি হলে বা ৩ দিনের বেশি থাকলে জরুরি চিকিৎসা নিন।',
      forwardToExpert: true,
      emergency: false
    },
    'Skin Infection / চামড়ার সংক্রমণ': {
      keywords: ['skin infection', 'wound infection', 'pus', 'abscess', 'ক্ষতে পুঁজ', 'ফোড়া', 'চামড়া লাল', 'infected wound'],
      severity: 'Medium',
      description: 'ক্ষত/চামড়ায় সংক্রমণ — এন্টিবায়োটিক প্রয়োজন হতে পারে',
      medicines: [
        { name: 'Paracetamol 500mg (ব্যথায়)', dosage: '১ টি', frequency: 'প্রতি ৮ ঘণ্টায়', duration: '৩ দিন' },
        { name: 'Povidone-Iodine (সেভলন/বেটাডিন)', dosage: 'পরিষ্কার কাপড়ে লাগিয়ে ক্ষতে দিন', frequency: 'দিনে ২ বার', duration: 'সুস্থ না হওয়া পর্যন্ত' }
      ],
      instructions: '⚠️ ক্ষত পরিষ্কার রাখুন। নোংরা হাতে ধরবেন না। ডাক্তার দেখান — এন্টিবায়োটিক লাগতে পারে। জ্বর থাকলে দ্রুত যান।',
      forwardToExpert: true,
      emergency: false
    },
    'পোকায় কামড় / Insect/Snake Bite': {
      keywords: ['snake bite', 'insect bite', 'সাপে কামড়', 'পোকায় কামড়', 'বিছায় কামড়', 'মৌমাছি', 'bee sting'],
      severity: 'Medium',
      description: 'পোকা/সাপে কামড় — ধরন অনুযায়ী চিকিৎসা প্রয়োজন',
      medicines: [
        { name: 'Antihistamine (Fexofenadine 120mg)', dosage: '১ টি', frequency: 'দিনে ১ বার', duration: '৩ দিন' }
      ],
      instructions: '⚠️ সাপে কামড় হলে: বাঁধবেন না, চুষবেন না, কাটবেন না! এখনই হাসপাতালে যান। পোকায় কামড় হলে: বরফ দিন, এলার্জি হলে ডাক্তার দেখান।',
      forwardToExpert: true,
      emergency: false
    },

    // === LOW RISK ===
    'সর্দি-কাশি / Common Cold': {
      keywords: ['cold', 'runny nose', 'sneezing', 'mild cough', 'sore throat', 'সর্দি', 'নাক দিয়ে পানি', 'হাঁচি', 'গলা ব্যথা', 'কাশি'],
      severity: 'Low',
      description: 'সাধারণ সর্দি-কাশি — ঘরোয়া চিকিৎসায় ভালো হয়',
      medicines: [
        { name: 'Paracetamol (নাপা/এস) 500mg', dosage: '১ টি ট্যাবলেট', frequency: 'জ্বর থাকলে প্রতি ৬-৮ ঘণ্টায়', duration: '৩ দিন' },
        { name: 'Fexofenadine (ফেক্সো) 120mg', dosage: '১ টি', frequency: 'দিনে ১ বার', duration: '৫ দিন' },
        { name: 'ভাপ নেওয়া (Steam Inhalation)', dosage: 'গরম পানিতে মেন্থল', frequency: 'দিনে ২ বার', duration: '৩-৫ দিন' },
        { name: 'মধু + লেবু + গরম পানি', dosage: '১ কাপ', frequency: 'দিনে ৩ বার', duration: 'সুস্থ না হওয়া পর্যন্ত' }
      ],
      instructions: '✅ বিশ্রাম নিন। গরম পানি ও তরল খান। মধু + গরম পানি গলা ব্যথায় কাজ করে। ভাপ নিলে নাক বন্ধ কমে। হাত ধোয়ার অভ্যাস রাখুন। সাধারণত ৫-৭ দিনে ভালো হয়ে যায়।',
      forwardToExpert: false,
      emergency: false
    },
    'মাথাব্যথা / Headache': {
      keywords: ['headache', 'head pain', 'মাথাব্যথা', 'মাথা ধরেছে', 'মাথা ব্যথা', 'migraine', 'মাইগ্রেন'],
      severity: 'Low',
      description: 'সাধারণ মাথাব্যথা/মাইগ্রেন',
      medicines: [
        { name: 'Paracetamol (নাপা) 500mg', dosage: '১-২ টি', frequency: 'প্রতি ৬-৮ ঘণ্টায়', duration: '১-৩ দিন' }
      ],
      instructions: '✅ পর্যাপ্ত ঘুম ও বিশ্রাম নিন। পানি খান। চোখ বন্ধ করে অন্ধকারে বিশ্রাম নিন। ঘন ঘন মাথাব্যথা হলে ডাক্তার দেখান।',
      forwardToExpert: false,
      emergency: false
    },
    'পেটের সমস্যা / Stomach Issues': {
      keywords: ['stomach pain', 'diarrhea', 'vomiting', 'nausea', 'gas', 'acidity', 'পেট ব্যথা', 'ডায়রিয়া', 'পাতলা পায়খানা', 'বমি', 'গ্যাস', 'এসিডিটি', 'বদহজম'],
      severity: 'Low',
      description: 'পেটের সাধারণ সমস্যা — গ্যাস/এসিডিটি/হালকা ডায়রিয়া',
      medicines: [
        { name: 'ORS (ওরস্যালাইন)', dosage: '১ প্যাকেট ১ লিটার পানিতে', frequency: 'ঘন ঘন চুমুক দিয়ে', duration: 'ডায়রিয়া থাকলে' },
        { name: 'Antacid (এন্টাসিড)', dosage: '২ চামচ', frequency: 'খাওয়ার পর দিনে ৩ বার', duration: '৩-৫ দিন' },
        { name: 'Domperidone (ডমপেরিডন) 10mg', dosage: '১ টি', frequency: 'দিনে ৩ বার (খাওয়ার আগে)', duration: '৩ দিন' }
      ],
      instructions: '✅ হালকা খাবার খান (ভাত, কলা, টোস্ট)। তৈলাক্ত/ভাজাপোড়া এড়িয়ে চলুন। প্রচুর পানি ও ওরস্যালাইন খান। ডায়রিয়া ৩ দিনের বেশি থাকলে বা রক্ত গেলে ডাক্তার দেখান।',
      forwardToExpert: false,
      emergency: false
    },
    'চুলকানি/এলার্জি / Allergy': {
      keywords: ['allergy', 'itching', 'rash', 'hives', 'এলার্জি', 'চুলকানি', 'র‍্যাশ', 'আমবাত', 'ত্বকে লাল'],
      severity: 'Low',
      description: 'এলার্জি/চুলকানি — সাধারণত ওষুধে কমে',
      medicines: [
        { name: 'Fexofenadine (ফেক্সো) 120mg', dosage: '১ টি', frequency: 'দিনে ১ বার', duration: '৫-৭ দিন' },
        { name: 'Calamine Lotion', dosage: 'আক্রান্ত স্থানে লাগান', frequency: 'দিনে ২-৩ বার', duration: 'চুলকানি কমা পর্যন্ত' }
      ],
      instructions: '✅ যে জিনিসে এলার্জি হয় সেটা এড়িয়ে চলুন। নখ দিয়ে চুলকাবেন না। ঠাণ্ডা পানিতে গোসল করুন। ফুলে গেলে বা শ্বাসকষ্ট হলে এখনই ডাক্তারে যান!',
      forwardToExpert: false,
      emergency: false
    },
    'পিঠ/কোমর ব্যথা / Back Pain': {
      keywords: ['back pain', 'lower back', 'পিঠ ব্যথা', 'কোমর ব্যথা', 'মেরুদণ্ড ব্যথা'],
      severity: 'Low',
      description: 'পিঠ/কোমরের সাধারণ ব্যথা',
      medicines: [
        { name: 'Paracetamol 500mg', dosage: '১ টি', frequency: 'প্রতি ৮ ঘণ্টায়', duration: '৩-৫ দিন' },
        { name: 'Diclofenac Gel (ভলটারেন জেল)', dosage: 'ব্যথার জায়গায় মালিশ করুন', frequency: 'দিনে ২-৩ বার', duration: '৫-৭ দিন' }
      ],
      instructions: '✅ ভারী জিনিস তুলবেন না। সোজা হয়ে বসুন। গরম সেঁক দিন। হালকা ব্যায়াম করুন। ১ সপ্তাহে ভালো না হলে ডাক্তার দেখান।',
      forwardToExpert: false,
      emergency: false
    },
    'চোখ ওঠা / Conjunctivitis': {
      keywords: ['eye infection', 'red eye', 'চোখ ওঠা', 'চোখ লাল', 'চোখ চুলকায়', 'চোখ দিয়ে পানি পড়ে'],
      severity: 'Low',
      description: 'চোখের সংক্রমণ/কনজাঙ্কটিভাইটিস',
      medicines: [
        { name: 'Chloramphenicol Eye Drop', dosage: '১-২ ফোঁটা', frequency: 'দিনে ৪ বার', duration: '৫-৭ দিন' }
      ],
      instructions: '✅ হাত পরিষ্কার রাখুন। চোখ ঘষবেন না। আলাদা তোয়ালে ব্যবহার করুন। অন্যদের থেকে দূরে থাকুন — এটা ছোঁয়াচে।',
      forwardToExpert: false,
      emergency: false
    },
    'হালকা জ্বর / Mild Fever': {
      keywords: ['mild fever', 'slight fever', 'হালকা জ্বর', 'একটু জ্বর', 'গা একটু গরম'],
      severity: 'Low',
      temperatureRange: [99, 100.9],
      description: 'হালকা জ্বর — সাধারণত ঘরোয়া চিকিৎসায় ভালো হয়',
      medicines: [
        { name: 'Paracetamol (নাপা) 500mg', dosage: '১ টি', frequency: 'প্রতি ৬-৮ ঘণ্টায়', duration: '২-৩ দিন' }
      ],
      instructions: '✅ বিশ্রাম নিন। প্রচুর পানি খান। হালকা খাবার খান। ৩ দিনে ভালো না হলে বা তাপমাত্রা ১০২°F এর বেশি হলে ডাক্তার দেখান।',
      forwardToExpert: false,
      emergency: false
    }
  }

  // Match symptoms against database
  let matchedDiseases = []
  
  for (const [diseaseName, disease] of Object.entries(DISEASE_DATABASE)) {
    let score = 0
    for (const keyword of disease.keywords) {
      if (symptomsLower.includes(keyword.toLowerCase())) {
        score += 3
      }
    }
    
    // Check temperature thresholds
    if (disease.temperatureThreshold && temperature >= disease.temperatureThreshold) {
      score += 2
    }
    if (disease.temperatureRange && temperature >= disease.temperatureRange[0] && temperature <= disease.temperatureRange[1]) {
      score += 1
    }

    // Blood pressure checks
    if (bloodPressure?.systolic) {
      if (bloodPressure.systolic >= 180 || bloodPressure.diastolic >= 120) score += 2
      if (bloodPressure.systolic <= 80) score += 2
    }

    if (score > 0) {
      matchedDiseases.push({ name: diseaseName, ...disease, score })
    }
  }

  // Sort by severity and score
  const severityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 }
  matchedDiseases.sort((a, b) => {
    if (severityOrder[b.severity] !== severityOrder[a.severity]) {
      return severityOrder[b.severity] - severityOrder[a.severity]
    }
    return b.score - a.score
  })

  // Temperature-only fallback
  if (matchedDiseases.length === 0 && temperature) {
    if (temperature >= 104) {
      return {
        success: true,
        riskLevel: 'High',
        detectedDisease: 'বিপজ্জনক উচ্চ জ্বর / Dangerously High Fever',
        description: 'অত্যন্ত উচ্চ জ্বর (>104°F) — জরুরি',
        aiRecommendation: '🚨 জরুরি: অত্যন্ত উচ্চ জ্বর সনাক্ত হয়েছে। এখনই হাসপাতালে নিন!',
        suggestedMedicines: [],
        instructions: 'ভেজা কাপড় দিয়ে শরীর মুছে দিন। জ্ঞান থাকলে Paracetamol দিন। এখনই হাসপাতালে নিন।',
        emergency: true,
        forwardToExpert: true
      }
    } else if (temperature >= 100) {
      return {
        success: true,
        riskLevel: 'Medium',
        detectedDisease: 'জ্বর (মাঝারি) / Moderate Fever',
        description: 'মাঝারি জ্বর — কারণ নির্ণয় প্রয়োজন',
        aiRecommendation: '⚠️ মাঝারি জ্বর সনাক্ত হয়েছে। Medical Expert-এর কাছে পাঠানো হচ্ছে।',
        suggestedMedicines: [
          { name: 'Paracetamol 500mg', dosage: '১ টি', frequency: 'প্রতি ৬ ঘণ্টায়', duration: '৩-৫ দিন' },
          { name: 'ORS', dosage: '১ প্যাকেট ১ লিটার পানিতে', frequency: 'ঘন ঘন', duration: 'জ্বর কমা পর্যন্ত' }
        ],
        instructions: 'বিশ্রাম নিন। প্রচুর পানি ও তরল খান। তাপমাত্রা প্রতি ৪ ঘণ্টায় মাপুন।',
        emergency: false,
        forwardToExpert: true
      }
    }
  }

  // No matches at all
  if (matchedDiseases.length === 0) {
    return {
      success: true,
      riskLevel: 'Medium',
      detectedDisease: 'সাধারণ স্বাস্থ্য সমস্যা / General Health Concern',
      description: 'নির্দিষ্ট রোগ সনাক্ত হয়নি — বিশেষজ্ঞ পর্যালোচনা প্রয়োজন',
      aiRecommendation: '⚠️ আপনার লক্ষণগুলো নোট করা হয়েছে। Medical Expert-এর কাছে পাঠানো হচ্ছে বিস্তারিত পর্যালোচনার জন্য।\n\nইতিমধ্যে: বিশ্রাম নিন, প্রচুর পানি খান, পুষ্টিকর খাবার খান। লক্ষণ বাড়লে দ্রুত ডাক্তার দেখান।',
      suggestedMedicines: [
        { name: 'Paracetamol 500mg (ব্যথা/জ্বরে)', dosage: '১ টি', frequency: 'প্রয়োজনে প্রতি ৬-৮ ঘণ্টায়', duration: '২-৩ দিন' }
      ],
      instructions: 'বিশ্রাম নিন। প্রচুর পানি খান। পুষ্টিকর খাবার খান। ৩ দিনে ভালো না হলে ডাক্তার দেখান।',
      emergency: false,
      forwardToExpert: true
    }
  }

  // Use top match
  const top = matchedDiseases[0]
  
  let recommendation = ''
  if (top.severity === 'High') {
    recommendation = `🚨 জরুরি সতর্কতা — ${top.name} সনাক্ত হয়েছে!\n\n${top.description}\n\n${top.instructions}\n\n🏥 রোগীকে এখনই হাসপাতালে/Medical Expert-এর কাছে নিয়ে যান!`
  } else if (top.severity === 'Medium') {
    recommendation = `⚠️ ${top.name} সনাক্ত হয়েছে\n\n${top.description}\n\n📋 Medical Expert-এর কাছে পাঠানো হচ্ছে বিস্তারিত পর্যালোচনার জন্য।\n\n💊 প্রাথমিক পরামর্শ:\n${top.instructions}`
  } else {
    recommendation = `✅ ${top.name} সনাক্ত হয়েছে\n\n${top.description}\n\n💊 ঘরোয়া চিকিৎসা:\n${top.instructions}`
  }

  return {
    success: true,
    riskLevel: top.severity,
    detectedDisease: top.name,
    description: top.description,
    aiRecommendation: recommendation,
    suggestedMedicines: top.severity === 'High' ? [] : (top.medicines || []),
    instructions: top.instructions,
    emergency: top.emergency || false,
    forwardToExpert: top.forwardToExpert !== undefined ? top.forwardToExpert : (top.severity !== 'Low')
  }
}
