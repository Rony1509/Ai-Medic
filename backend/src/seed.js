// Seed script to create initial users
// Run with: node backend/src/seed.js

import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import config from './config.js'

// User Schema (inline since we're not importing models)
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true },
  role: { type: String, enum: ['rural-medical-worker', 'medical-expert', 'health-authority', 'admin'], required: true },
  isApproved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
})

const User = mongoose.model('User', userSchema)

const seedUsers = async () => {
  try {
    await mongoose.connect(config.mongoUri)
    console.log('✅ MongoDB Connected')

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash('admin123', salt)

    // Check if admin exists
    const existingAdmin = await User.findOne({ email: 'admin@gmail.com' })
    
    if (!existingAdmin) {
      await User.create({
        email: 'admin@gmail.com',
        password: hashedPassword,
        fullName: 'System Admin',
        role: 'admin',
        isApproved: true
      })
      console.log('✅ Admin user created: admin@gmail.com / admin123')
    } else {
      console.log('ℹ️ Admin user already exists')
    }

    // Create sample RMW
    const existingRMW = await User.findOne({ email: 'rmw@gmail.com' })
    if (!existingRMW) {
      const rmwPassword = await bcrypt.hash('rmw123', salt)
      await User.create({
        email: 'rmw@gmail.com',
        password: rmwPassword,
        fullName: 'John RMW',
        role: 'rural-medical-worker',
        isApproved: true
      })
      console.log('✅ RMW user created: rmw@gmail.com / rmw123')
    }

    // Create sample Medical Expert
    const existingExpert = await User.findOne({ email: 'expert@gmail.com' })
    if (!existingExpert) {
      const expertPassword = await bcrypt.hash('expert123', salt)
      await User.create({
        email: 'expert@gmail.com',
        password: expertPassword,
        fullName: 'Dr. Smith',
        role: 'medical-expert',
        isApproved: true
      })
      console.log('✅ Medical Expert created: expert@gmail.com / expert123')
    }

    // Create sample Health Authority
    const existingHA = await User.findOne({ email: 'ha@gmail.com' })
    if (!existingHA) {
      const haPassword = await bcrypt.hash('ha123', salt)
      await User.create({
        email: 'ha@gmail.com',
        password: haPassword,
        fullName: 'Health Authority',
        role: 'health-authority',
        isApproved: true
      })
      console.log('✅ Health Authority created: ha@gmail.com / ha123')
    }

    console.log('\n🎉 Seed completed!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Seed error:', error.message)
    process.exit(1)
  }
}

seedUsers()

