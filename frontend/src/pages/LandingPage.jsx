import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        {/* Logo/Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-gray-800 mb-2">AI Village Medic</h1>
          <p className="text-lg text-gray-600">Healthcare Assistance for Rural Communities</p>
        </div>

        {/* Description */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <p className="text-gray-700 text-lg leading-relaxed mb-4">
            Welcome to AI Village Medic - an intelligent, web-based healthcare assistance platform designed to bridge the gap between rural patients and professional healthcare services.
          </p>
          <p className="text-gray-600 text-md">
            We combine AI-driven risk assessment with human medical expertise to make rural healthcare more accessible, efficient, and reliable.
          </p>
        </div>

        {/* Auth Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/login"
            className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition duration-300 shadow-md hover:shadow-lg"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="px-8 py-4 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition duration-300 shadow-md hover:shadow-lg"
          >
            Register
          </Link>
        </div>

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="text-3xl mb-2">🏥</div>
            <h3 className="font-semibold text-gray-800 mb-2">Preliminary Diagnosis</h3>
            <p className="text-gray-600 text-sm">AI-powered risk assessment for faster diagnosis</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="text-3xl mb-2">👨‍⚕️</div>
            <h3 className="font-semibold text-gray-800 mb-2">Expert Review</h3>
            <p className="text-gray-600 text-sm">Professional medical expert validation</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="text-3xl mb-2">📱</div>
            <h3 className="font-semibold text-gray-800 mb-2">Continuous Follow-up</h3>
            <p className="text-gray-600 text-sm">Digital monitoring and health tracking</p>
          </div>
        </div>
      </div>
    </div>
  )
}
