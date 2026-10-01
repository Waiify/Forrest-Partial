import { useRef, useState } from 'react'
import { Eye, EyeOff, Mail, Lock, KeyRound } from 'lucide-react'
import './index.css'
import ReCAPTCHA from 'react-google-recaptcha'
import { useNavigate } from 'react-router-dom'
import googleImage from './assets/G-logo.png'
import logoImage from './assets/logo.jpg'
import backgroundImage from './assets/page_background.jpg'
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "./firebase";

// Stores information in the database
function StaffLogin() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    staffCode: '',
  })

  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState({ loading: false, error: '', success: '' })

  const recaptchaRef = useRef(null)
  const [captchaToken, setCaptchaToken] = useState(null)

  // Returns ok:true only if the CAPTCHA was ticked and Google confirmed it
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
    } catch (err) {
      console.error('Captcha fetch error:', err)
      return { ok: false, message: 'Could not verify CAPTCHA. Please try again.' }
    }
  }

    const handleGoogleLogin = async () => {
    try {
      const captcha = await verifyCaptcha()
      if (!captcha.ok) {
        alert(captcha.message)
        return
      }

      const result = await signInWithPopup(auth, googleProvider)
      const idToken = await result.user.getIdToken()

      const res = await fetch('http://localhost:5000/api/auth/google-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Google login failed')

      if (!data.needsStaffCode) {
        alert('This Google account is not a staff account.')
        return
      }

      sessionStorage.setItem('pendingToken', data.tempToken)
      navigate('/StaffCode')
    } catch (error) {
      console.error("Google login error:", error)
      alert("Google login failed. Please try again.")
    }
  }

  /* handles changes when the user inputs in the fields */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    })
  }

    const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()

    const captcha = await verifyCaptcha()
    if (!captcha.ok) {
      setStatus({ loading: false, error: captcha.message, success: '' })
      return
    }


    setStatus({ loading: true, error: '', success: '' })

    try {

      const loginRes = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      })
      const loginData = await loginRes.json()
      if (!loginRes.ok) throw new Error(loginData.message || 'Login failed')

      if (!loginData.needsStaffCode) {
        throw new Error('This account is not a staff account')
      }

     
      const codeRes = await fetch('http://localhost:5000/api/auth/staff-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${loginData.tempToken}`,
        },
        body: JSON.stringify({ staffCode: formData.staffCode }),
      })
      const codeData = await codeRes.json()
      if (!codeRes.ok) throw new Error(codeData.message || 'Invalid staff code')

      sessionStorage.setItem('token', codeData.token)
      sessionStorage.setItem('user', JSON.stringify(codeData.user))
      setStatus({ loading: false, error: '', success: 'Logged in successfully!' })
      navigate('/dashboard')
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

      {/* container sa  left and right card */}
      <div className="relative w-full max-w-5xl h-[600px] flex flex-col md:flex-row items-stretch bg-white/95 rounded-2xl shadow-xl overflow-hidden border border-green-950">

        {/* left card */}
        <div style={{ flex: 0.8 }} className="signup-left-card relative bg-white/90 rounded-2xl p-8 md:p-6 flex flex-col justify-center">

          <h2 className="text-2xl font-bold text-green-800 mb-1 mt-4">Welcome, Staff!</h2>
          <p className="text-sm text-gray-500 mt-2 mb-4">
            Enter your credentials to continue to your study space!
          </p>

          <form onSubmit={handleSubmit} className="signup-form flex flex-col gap-3">

            <div className="flex flex-col gap-1 mb-0.9">
              <label htmlFor="email" className="text-xs font-semibold text-green-800">Email</label>
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
              <label htmlFor="password" className="text-xs font-semibold text-green-800">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
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
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-green-800"
                >
                  {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1 mb-0.9">
              <label htmlFor="staffCode" className="text-xs font-semibold text-green-800">Staff Code</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  id="staffCode"
                  name="staffCode"
                  placeholder="Staff Code"
                  value={formData.staffCode}
                  onChange={handleChange}
                  required
                  className={inputClass}
                />
              </div>
            </div>
            <div className="flex justify-center" style={{height:66}}>
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

            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-gray-300"></div>
              <span className="text-xs text-gray-400">or</span>
              <div className="flex-1 h-px bg-gray-300"></div>
            </div>

            <button
  type="button"
  onClick={handleGoogleLogin}
  className="google-signup-button w-full flex items-center justify-center gap-2 border border-gray-300 rounded-lg py-3 text-xs font-medium hover:bg-gray-50 transition mb-2"
>
  <img
    src={googleImage}
    alt="Google Icon"
    className="google-icon h-4 w-4"
  />

  Continue with Google
</button>

          </form>
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

export default StaffLogin