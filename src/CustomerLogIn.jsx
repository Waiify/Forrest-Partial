import {useRef, useState } from 'react'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import './index.css'
import ReCAPTCHA from "react-google-recaptcha";
import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from './firebase'
import backgroundImage from './assets/page_background.jpg'
import logoImage from './assets/logo.jpg'
import googleImage from './assets/G-logo.png'

const demoLogin = (user) => {
  const safeUser = {
    id: user.id || 'demo-customer',
    firstName: user.firstName || 'Demo',
    lastName: user.lastName || 'Customer',
    email: user.email || 'demo@forrest.com',
    username: user.username || 'demo_customer',
    role: user.role || 'customer',
  }

  sessionStorage.setItem('token', 'demo-token')
  sessionStorage.setItem('user', JSON.stringify(safeUser))
  return safeUser
}
// Stores information in the database
function CustomerLogIn() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const navigate = useNavigate()

  const recaptchaRef = useRef(null)
  const [captchaToken, setCaptchaToken] = useState(null)

// CAPTCHA verification function ni to ensure nga user completed the CAPTCHA ayha mo login
  const verifyCaptcha = async () => {
    if (!captchaToken) {
      return { ok: false, message: 'Please complete the CAPTCHA.' }
  }
  try {
    const res = await fetch('http://localhost:5000/verify-captcha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: captchaToken }),
    })
    const data = await res.json()
    if (!data.success) {
      recaptchaRef.current?.reset()
      setCaptchaToken(null)
      return { ok: false, message: 'CAPTCHA failed. Please try again.' }
    }
    return { ok: true }
  } catch {
    return { ok: false, message: 'Could not verify CAPTCHA. Please try again.' }
  }
}

const handleGoogleLogin = async () => {
  const captcha = await verifyCaptcha()
  if (!captcha.ok) {
    alert(captcha.message)
    return
  }

  
  try {
    const result = await signInWithPopup(auth, googleProvider)
    const idToken = await result.user.getIdToken()

    const res = await fetch('http://localhost:5000/api/auth/google-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Google login failed')

    if (data.needsStaffCode) {
      sessionStorage.setItem('pendingToken', data.tempToken)
      navigate('/StaffCode')
      return
    }
    if (data.needsAdminCode) {
       alert('Admins must sign in on the admin page.')
      return
   }

    sessionStorage.setItem('token', data.token)
    sessionStorage.setItem('user', JSON.stringify(data.user))
    navigate('/dashboard')
    } catch (error) {
      console.error("Google login error:", error)
      alert("Google login failed. Please try again.")
    }
  }

  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState({ loading: false, error: '', success: '' })

  /* handles changes when the user inputs in the fields */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    })
  }

   const handleSubmit = async (e) => {
    e.preventDefault()

  const captcha = await verifyCaptcha()
  if (!captcha.ok) {
    setStatus({ loading: false, error: captcha.message, success: '' })
    return
  }

  setStatus({ loading: true, error: '', success: '' })
  
    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Login failed')

      if (data.needsStaffCode) {
        sessionStorage.setItem('pendingToken', data.tempToken)
        navigate('/StaffCode')
        return
      }

      sessionStorage.setItem('token', data.token)
      sessionStorage.setItem('user', JSON.stringify(data.user))
      setStatus({ loading: false, error: '', success: 'Logged in successfully!' })
      navigate('/dashboard')
    } catch (err) {
      setStatus({ loading: false, error: err.message, success: '' })
    }
  }
   
  const inputClass =
    "w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-green-800"

  return (
    <div
    className="min-h-screen w-full flex items-center justify-center p-6"
    style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: "cover",
        backgroundAttachment: "fixed",
        backgroundPosition: "center"
      }}
    >
      <div className="absolute inset-0 bg-black/10 pointer-events-none"></div>

      {/* container for left and right card */}
      <div className="relative w-full max-w-5xl min-h-[600px] flex flex-col md:flex-row items-stretch bg-white/95 rounded-2xl shadow-xl overflow-hidden border border-green-950">

        {/* left card */}
        <div style={{ flex: 0.8 }} className="login-left-card relative bg-white/90 rounded-2xl p-8 md:p-6 flex flex-col justify-center">

          <h2 className="text-2xl font-bold text-green-800 mb-1">Welcome back, Customer!</h2>
          <p className="text-sm text-gray-500 mt-2 mb-4">
            Enter your credentials to continue to your study space!
          </p>

          <form onSubmit={handleSubmit} className="login-form flex flex-col gap-3">

            <div className="flex flex-col gap-2 mb-2 mt-2">
              <label htmlFor="email" className="text-xs font-semibold text-green-800">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1 mb-2">
              <label htmlFor="password" className="text-xs font-semibold text-green-800">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className={`${inputClass} pl-10 pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-green-800"
                >
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end mb-2">
              <Link
                to="/reset-password"
                className="text-xs font-medium text-green-800 hover:underline"
              >
                Forgot Password?
              </Link>
            </div>
              
            <div className="flex justify-center mb-2" style={{ height: 66 }}>
              <div style={{ transform: 'scale(0.85)', transformOrigin: 'top center' }}>
                <ReCAPTCHA
                   ref={recaptchaRef}
                   sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                   onChange={(token) => setCaptchaToken(token)}
                   onExpired={() => setCaptchaToken(null)}
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

            <div className="flex items-center gap-3 my-1 mt-4 mb-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">or login with</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

           
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="google-login-button w-full flex items-center justify-center gap-2 border border-gray-300 rounded-lg py-3 text-xs font-medium hover:bg-gray-50 transition"
            >
              <img src={googleImage} alt="Google Icon" className="h-4 w-4" />
              Continue with Google
            </button>

          </form>

          <button
            type="button"
            onClick={() => navigate("/CustomerSignUp")}
            className="text-xs text-green-700 hover:text-green-800 transition mt-4"
          >
            <span className="text-gray-600">Does not have an account? </span>
            Sign up
          </button>

        </div>

        {/* right card */}
        <div style={{ flex: 0.4 }} className="relative overflow-hidden rounded-r-2xl px-8 pb-8 flex flex-col justify-start">
          <div
            style={{
              backgroundImage: `url(${backgroundImage})`,
              backgroundSize: "cover",
              backgroundAttachment: "fixed",
              backgroundPosition: "center",
              opacity: 0.9
            }}
            className="absolute inset-0 scale-110 blur-sm pointer-events-none"
          ></div>
          <div className="absolute inset-0 bg-green-950/40"></div>

          <div className="relative z-10">
            <img src={logoImage} alt="Forrest Logo" className="w-[70px] h-[70px] rounded-full mb-6 mt-8" />
            <h2 className="text-2xl font-bold text-white leading-snug">Find your space.</h2>
            <h2 className="text-2xl font-bold text-white leading-snug mb-2">Find your focus.</h2>
            <h3 className="text-sm text-white opacity-90">Focus. Connect. Grow</h3>

            <div className="mt-6 space-y-1">
              <h3 className="text-sm text-white opacity-90">Forrest Co-working space is a</h3>
              <h3 className="text-sm text-white opacity-90">study hub where you can find the</h3>
              <h3 className="text-sm text-white opacity-90">perfect place to focus and grow</h3>
              <h3 className="text-sm text-white opacity-90">your ideas.</h3>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default CustomerLogIn