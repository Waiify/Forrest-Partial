import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import './index.css'
import backgroundImage from './assets/page_background.jpg'

const CODE_LENGTH = 6
const RESEND_COOLDOWN = 60 // seconds

// Mag verify sa code sent to the customer's email before allowing a password reset
function VerifyCode() {
  const navigate = useNavigate()
  const location = useLocation()
  const email = location.state?.email || ''

  const [code, setCode] = useState(Array(CODE_LENGTH).fill(''))
  const [status, setStatus] = useState({ loading: false, error: '', success: '' })
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN)
  const inputRefs = useRef([])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const focusInput = (index) => {
    inputRefs.current[index]?.focus()
  }

  const handleChange = (index, e) => {
    const value = e.target.value.replace(/[^0-9]/g, '')
    if (!value) {
      const next = [...code]
      next[index] = ''
      setCode(next)
      return
    }

    const next = [...code]
    next[index] = value[value.length - 1]
    setCode(next)

    if (index < CODE_LENGTH - 1) {
      focusInput(index + 1)
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      focusInput(index - 1)
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      focusInput(index - 1)
    }
    if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      focusInput(index + 1)
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, CODE_LENGTH)
    if (!pasted) return

    const next = Array(CODE_LENGTH).fill('')
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i]
    }
    setCode(next)
    focusInput(Math.min(pasted.length, CODE_LENGTH - 1))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const fullCode = code.join('')

    if (fullCode.length < CODE_LENGTH) {
      setStatus({ loading: false, error: 'Please enter the full 6-digit code.', success: '' })
      return
    }

    setStatus({ loading: true, error: '', success: '' })

        try {
      const res = await fetch('http://localhost:5000/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: fullCode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Invalid or expired code.')

      navigate('/set-new-password', { state: { email, resetToken: data.resetToken } })
    } catch (err) {
      setStatus({ loading: false, error: err.message, success: '' })
    }
  }

  const handleResend = async () => {
    if (cooldown > 0) return
        try {
      const res = await fetch('http://localhost:5000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error()

      setCode(Array(CODE_LENGTH).fill(''))
      setStatus({ loading: false, error: '', success: 'A new code has been sent.' })
      setCooldown(RESEND_COOLDOWN)
      focusInput(0)
    } catch {
      setStatus({ loading: false, error: 'Could not resend code. Please try again.', success: '' })
    }
  }

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

      {/* single centered card */}
      <div className="relative w-full max-w-md bg-white/95 rounded-2xl shadow-xl overflow-hidden border border-green-950 p-8 md:p-10">

        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <ShieldCheck className="h-6 w-6 text-green-800" />
        </div>

        <h2 className="text-2xl font-bold text-green-800 mb-1">Enter verification code</h2>
        <p className="text-sm text-gray-500 mt-2 mb-6">
        We sent a 6-digit code to <span className="font-medium text-gray-700">{email || 'your email'}</span>. Enter it below to continue.
        </p>

        <form onSubmit={handleSubmit} className="signup-form flex flex-col gap-4">

          <div className="flex justify-between gap-2" onPaste={handlePaste}>
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-14 text-center text-lg font-semibold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-800"
              />
            ))}
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
            {status.loading ? 'Verifying...' : 'Verify Code'}
          </button>

          <p className="text-center text-xs text-gray-500">
            Didn't get the code?{' '}
            {cooldown > 0 ? (
              <span className="text-gray-400">Resend in {cooldown}s</span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="font-semibold text-green-800 underline hover:text-green-900"
              >
                Resend code
              </button>
            )}
          </p>

          <Link
            to="/reset-password"
            className="flex items-center justify-center gap-1 text-xs font-medium text-green-800 hover:underline mt-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>

        </form>
      </div>
    </div>
  )
}

export default VerifyCode