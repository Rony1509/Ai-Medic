import jwt from 'jsonwebtoken'
import config from '../config.js'

export const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    config.jwtSecret,
    { expiresIn: config.jwtExpire }
  )
}

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwtSecret)
  } catch (error) {
    throw new Error('Invalid or expired token')
  }
}

export const decodeToken = (token) => {
  try {
    return jwt.decode(token)
  } catch (error) {
    return null
  }
}
