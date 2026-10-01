import { useState } from 'react'
import { Lock, Eye, EyeOff } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import './index.css'
import backgroundImage from './assets/page_background.jpg'

function SetNewPassword() {
  const navigate = useNavigate()
  const { email, resetToken } = useLocation().state || {}

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState({ loading: false, error: '', success: '' })

  const inputClass =
    "w-full border border-gray-300 rounded-lg pl-10 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !resetToken) {
      setStatus({ loading: false, error: 'Session expired. Please start again.', success: '' })
      return
    }
    if (newPassword.length < 8) {
      setStatus({ loading: false, error: 'Password must be at least 8 characters.', success: '' })
      return
    }
    if (newPassword !== confirmPassword) {
      setStatus({ loading: false, error: 'Passwords do not match.', success: '' })
      return
    }

    setStatus({ loading: true, error: '', success: '' })
    try {
      const res = await fetch('http://localhost:5000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, resetToken, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Could not reset password')

      setStatus({ loading: false, error: '', success: 'Password updated! Redirecting to login...' })
      setTimeout(() => navigate('/CustomerLogIn'), 1500)
    } catch (err) {
      setStatus({ loading: false, error: err.message, success: '' })
    }
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-6"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundAttachment: 'fixed',
        backgroundPosition: 'center',
      }}
    >
      <div className="relative w-full max-w-md bg-white/95 rounded-2xl shadow-xl border border-green-950 p-8 md:p-10">
        <h2 className="text-2xl font-bold text-green-800 mb-1">Set a new password</h2>
        <p className="text-sm text-gray-500 mt-2 mb-6">Use at least 8 characters.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label htmlFor="newPassword" className="text-xs font-semibold text-green-800">New Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              id="newPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-green-800"
            >
              {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
          </div>

          <label htmlFor="confirmPassword" className="text-xs font-semibold text-green-800">Confirm Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className={inputClass}
            />
          </div>

          {status.error && <p className="text-xs text-red-600">{status.error}</p>}
          {status.success && <p className="text-xs text-green-700">{status.success}</p>}

          <button
            type="submit"
            disabled={status.loading}
            className="w-full bg-green-900 text-white text-xs font-medium py-3 rounded-lg hover:bg-green-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {status.loading ? 'Saving...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default SetNewPassword