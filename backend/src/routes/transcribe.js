import express from 'express'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { config } from '../config.js'
import { authMiddleware } from '../middleware/auth.js'

const router = express.Router()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Store audio temporarily in uploads/audio/
const audioDir = path.join(__dirname, '../../uploads/audio')
if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, audioDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm'
    cb(null, `audio-${Date.now()}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['audio/webm', 'audio/ogg', 'audio/wav', 'audio/mp4', 'audio/mpeg', 'audio/mp3']
    if (allowed.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
      cb(null, true)
    } else {
      cb(new Error('Only audio files allowed'))
    }
  }
})

// POST /api/transcribe  — transcribe Bangla audio using Gemini
router.post('/', authMiddleware, upload.single('audio'), async (req, res) => {
  const filePath = req.file?.path
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No audio file provided' })
    }

    const audioBuffer = fs.readFileSync(filePath)
    const base64Audio = audioBuffer.toString('base64')
    const mimeType = req.file.mimetype.startsWith('audio/') ? req.file.mimetype : 'audio/webm'

    // Try multiple Gemini models in case one is quota-exhausted
    const models = ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-pro']
    let transcript = ''
    let lastError = null

    for (const modelName of models) {
      try {
        const genAI = new GoogleGenerativeAI(config.geminiApiKey)
        const model = genAI.getGenerativeModel({ model: modelName })

        const result = await model.generateContent([
          { inlineData: { mimeType, data: base64Audio } },
          {
            text: `This is a voice recording in Bangla (Bengali) describing medical symptoms.
Transcribe the speech accurately in Bangla script.
Output ONLY the transcribed text — no explanations, no labels, no quotes.
If no speech is detected, output: কিছু শোনা যায়নি`
          }
        ])

        transcript = result.response.text().trim()
        lastError = null
        break // success — stop trying other models
      } catch (err) {
        lastError = err
        if (err.status !== 429) break // only retry on quota errors
        console.log(`Model ${modelName} quota hit, trying next...`)
      }
    }

    // Clean up temp audio file
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath)

    if (lastError) {
      // All models failed
      if (lastError.status === 429) {
        return res.json({
          transcript: '',
          quota_exceeded: true,
          error: 'Gemini API quota exceeded for today. Please type symptoms manually.'
        })
      }
      throw lastError
    }

    return res.json({ transcript })

  } catch (err) {
    console.error('Transcription error:', err)
    // Clean up on error
    if (filePath && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath) } catch (_) {}
    }
    // Return empty transcript so frontend degrades gracefully
    return res.json({ transcript: '', error: err.message })
  }
})

export default router
