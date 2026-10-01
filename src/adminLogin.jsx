import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, KeyRound } from 'lucide-react'
import './index.css'
import logoImage from './assets/logo.jpg'
import backgroundImage from './assets/page_background.jpg'

const demoAdminLogin = (email) => {
  const user = {
    id: 'demo-admin',
    firstName: 'Admin',
    lastName: 'User',
    email,
    username: 'admin_user',
    role: 'admin',
  }

  sessionStorage.setItem('token', 'demo-admin-token')
  sessionStorage.setItem('user', JSON.stringify(user))
  return user
}

function AdminLogin() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    adminCode: '',
  })

  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState({
    loading: false,
    error: '',
    success: '',
  })

  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus({ loading: true, error: '', success: '' })

    try {
      const demoUser = demoAdminLogin(formData.email)
      setStatus({
        loading: false,
        error: '',
        success: `Logged in successfully as ${demoUser.firstName}!`,
      })
      navigate('/dashboard')
    } catch {
      setStatus({
        loading: false,
        error: 'Something went wrong. Please try again.',
        success: '',
      })
    }
  }

  const inputClass =
    'w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800'

  return (
    <div
      className="h-screen w-full flex items-center justify-center p-6"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundAttachment: 'fixed',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/10 pointer-events-none" />

      <div className="relative w-full max-w-5xl h-[600px] flex flex-col md:flex-row items-stretch bg-white/95 rounded-2xl shadow-xl overflow-hidden border border-green-950">
        <div
          style={{ flex: 0.8 }}
          className="signup-left-card relative bg-white/90 rounded-2xl p-8 md:p-6 flex flex-col justify-center"
        >
          <h2 className="text-2xl font-bold text-green-800 mb-1 mt-4">Welcome, Administrator!</h2>
          <p className="text-sm text-gray-500 mt-2 mb-4">
            Enter your credentials to continue to your study space!
          </p>

          <form onSubmit={handleSubmit} className="signup-form flex flex-col gap-3">
            <div className="flex flex-col gap-1 mb-0.9">
              <label htmlFor="email" className="text-xs font-semibold text-green-800">
                Email
              </label>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="youremail@gmail.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1 mb-0.9">
              <label htmlFor="password" className="text-xs font-semibold text-green-800">
                Password
              </label>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className={`${inputClass} pr-10`}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-green-800"
                >
                  {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1 mb-0.9">
              <label htmlFor="adminCode" className="text-xs font-semibold text-green-800">
                Admin Code
              </label>

              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  id="adminCode"
                  name="adminCode"
                  placeholder="Admin Code"
                  value={formData.adminCode}
                  onChange={handleChange}
                  required
                  className={inputClass}
                />
              </div>
            </div>

            {status.error && (
              <p className="signup-error text-xs text-red-600">{status.error}</p>
            )}

            {status.success && (
              <p className="signup-success text-xs text-green-700">{status.success}</p>
            )}

            <button
              type="submit"
              disabled={status.loading}
              className="w-full bg-green-900 text-white text-xs font-medium py-3 rounded-lg hover:bg-green-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {status.loading ? 'Logging In...' : 'Log In'}
            </button>
          </form>
        </div>

        <div
          style={{ flex: 0.4 }}
          className="relative overflow-hidden rounded-r-2xl px-8 pb-8 flex flex-col justify-start"
        >
          <div
            style={{
              backgroundImage: `url(${backgroundImage})`,
              backgroundSize: 'cover',
              backgroundAttachment: 'fixed',
              backgroundPosition: 'center',
              opacity: 0.9,
            }}
            className="absolute inset-0 scale-110 blur-sm pointer-events-none"
          />

          <div className="absolute inset-0 bg-green-950/40" />

          <div className="relative z-10">
            <img src={logoImage} alt="Forrest Logo" className="w-[70px] h-[70px] rounded-full mb-6 mt-8" />

            <h2 className="text-2xl font-bold text-white leading-snug">Find your space.</h2>
            <h2 className="text-2xl font-bold text-white leading-snug mb-2">Find your focus.</h2>

            <h3 className="text-sm text-white opacity-90">Focus. Connect. Grow</h3>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminLogin
