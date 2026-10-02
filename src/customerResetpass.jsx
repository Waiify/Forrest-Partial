import { useState } from 'react'
import { Mail, ArrowLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import './index.css'
import backgroundImage from './assets/page_background.jpg'


function ResetPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState({ loading: false, error: '', success: '' })

  const handleChange = (e) => {
    setEmail(e.target.value)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus({ loading: true, error: '', success: '' })

        try {
      const res = await fetch('http://localhost:5000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Could not send the code.')

      navigate('/verify-code', { state: { email } })
    } catch (err) {
      setStatus({ loading: false, error: err.message, success: '' })
    }
  }

  const inputClass =
    "w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"

  return (
    <div
      className="h-screen w-full flex items-center justify-center p-6"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: "cover",
        backgroundAttachment: "fixed",
        backgroundPosition: "center"
      }}
    >
      <div className="absolute inset-0 bg-black/10 pointer-events-none"></div>

      
      <div className="relative w-full max-w-md bg-white/95 rounded-2xl shadow-xl overflow-hidden border border-green-950 p-8 md:p-10">

        <h2 className="text-2xl font-bold text-green-800 mb-1 mt-2">Reset your password</h2>
        <p className="text-sm text-gray-500 mt-2 mb-6">
         Enter the email linked to your account and we'll send you a verification code to reset your password.
        </p>

        {!status.success ? (
          <form onSubmit={handleSubmit} className="signup-form flex flex-col gap-3">

            <div className="flex flex-col gap-1 mb-0.9">
              <label htmlFor="email" className="text-xs font-semibold text-green-800">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="youremail@gmail.com"
                  value={email}
                  onChange={handleChange}
                  required
                  className={inputClass}
                />
              </div>
            </div>

            {status.error && (
              <p className="signup-error text-xs text-red-600">{status.error}</p>
            )}

            <button
              type="submit"
              disabled={status.loading}
              className="w-full bg-green-900 text-white text-xs font-medium py-3 rounded-lg hover:bg-green-800 transition disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {status.loading ? 'Sending link...' : 'Send Reset Link'}
            </button>

            <Link
              to="/CustomerLogIn"
              className="flex items-center justify-center gap-1 text-xs font-medium text-green-800 hover:underline mt-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Login
            </Link>

          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="signup-success text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-3">
              {status.success}
            </p>
            <p className="text-xs text-gray-500">
              Didn't get the email? Check your spam folder, or{' '}
              <button
                type="button"
                onClick={() => setStatus({ loading: false, error: '', success: '' })}
                className="font-semibold text-green-800 underline hover:text-green-900"
              >
                try again
              </button>.
            </p>
            <Link
              to="/CustomerLogIn"
              className="flex items-center justify-center gap-1 text-xs font-medium text-green-800 hover:underline mt-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Login
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}

export default ResetPassword