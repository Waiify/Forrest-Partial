import { useState } from 'react'
import { Eye, EyeOff, User, Mail, Lock } from 'lucide-react'
import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from './firebase'
import { useNavigate } from 'react-router-dom'
import useSettings from './useSettings2'
import backgroundImage from './assets/page_background.jpg'
import googleLogo from './assets/G-logo.png'
import logoImage from './assets/logo.jpg'


function CustomerSignUp() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    username: '',
    terms: false
  })

  const navigate = useNavigate()

  // On/off settings from the admin Settings page
  const settings = useSettings()

  const [showPassword, setShowPassword] = useState(false)

  const [status, setStatus] = useState({
    loading: false,
    error: '',
    success: ''
  })

  // Handle changes when the user inputs in the fields
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target

    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    })
  }

  // Handle normal form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus({ loading: true, error: '', success: '' })

    try {
      const res = await fetch('http://localhost:5000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Sign up failed')

      setStatus({ loading: false, error: '', success: 'Account created successfully!' })
      navigate('/CustomerLogIn')
    } catch (err) {
      setStatus({ loading: false, error: err.message, success: '' })
    }
  }

  // Handle Google Sign-Up
  const handleGoogleSignUp = async () => {
    setStatus({ loading: true, error: '', success: '' })

    try {
      const result = await signInWithPopup(auth, googleProvider)
      const idToken = await result.user.getIdToken()

      const res = await fetch('http://localhost:5000/api/auth/google-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Google sign-in failed')

      setStatus({ loading: false, error: '', success: `Welcome, ${result.user.displayName}!` })
      navigate('/dashboard')
    } catch (error) {
      console.error('Google sign-in error:', error)
      setStatus({ loading: false, error: error.message || 'Google sign-in failed. Please try again.', success: '' })
    }
  }

  /* for the forms and inputs */
  const inputClass =
    "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-800"

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
      <div className="absolute inset-0 backgroundImage: pointer-events-none"></div>

      {/* Container for left and right card */}
      <div className="w-full max-w-5xl h-[600px] flex flex-col md:flex-row items-stretch bg-white/95 rounded-2xl shadow-xl overflow-hidden border border-green-950">

        {/* LEFT CARD */}
        <div
          style={{ flex: 0.8 }}
          className="signup-left-card relative bg-white/90 rounded-2xl p-8 md:p-6 flex flex-col justify-center"
        >

          <h2 className="text-2xl font-bold text-green-800 mb-1 mt-4">
            Create your account
          </h2>

          <p className="text-s text-black-500 mt-2 mb-4">
            Enter your credentials to continue to your study space!
          </p>

          <form
            onSubmit={handleSubmit}
            className="signup-form flex flex-col gap-3"
          >

            {/* NAME */}
            <div className="Name-group grid grid-cols-2 gap-4">

              {/* FIRST NAME */}
              <div className="flex flex-col gap-1 mb-0.9">
                <label
                  htmlFor="firstName"
                  className="text-xs font-semibold text-green-800"
                >
                  First Name
                </label>

                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>

              {/* LAST NAME */}
              <div className="flex flex-col gap-1 mb-0.9">
                <label
                  htmlFor="lastName"
                  className="text-xs font-semibold text-green-800"
                >
                  Last Name
                </label>

                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>

            </div>

            {/* EMAIL */}
            <div className="flex flex-col gap-1 mb-0.9">
              <label
                htmlFor="email"
                className="text-xs font-semibold text-green-800"
              >
                Email
              </label>

              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

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

            {/* USERNAME */}
            <div className="flex flex-col gap-1 mb-0.9">
              <label
                htmlFor="username"
                className="text-xs font-semibold text-green-800"
              >
                Username
              </label>

              <div className="relative">
                <User
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  type="text"
                  id="username"
                  name="username"
                  placeholder="Username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className={`${inputClass} pl-10 pr-10`}
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div className="flex flex-col gap-1 mb-0.9">

              <label
                htmlFor="password"
                className="text-xs font-semibold text-green-800"
              >
                Password
              </label>

              <div className="relative">

                <Lock
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className={`${inputClass} pr-10 pl-10`}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-green-800"
                >
                  {showPassword ? <Eye /> : <EyeOff />}
                </button>

              </div>

              <h4 className="text-xs text-gray-600">
                Use 8+ characters with a mix of letters, numbers, and symbols
              </h4>

              {/* TERMS */}
              <div className="flex items-start gap-2">

                <input
                  type="checkbox"
                  id="terms"
                  name="terms"
                  checked={formData.terms}
                  onChange={handleChange}
                  required
                  className="w-4 h-4 accent-green-700 cursor-pointer"
                />

                <label
                  htmlFor="terms"
                  className="text-xs text-gray-600 cursor-pointer"
                >
                  I agree to the Terms of Service and Privacy Policy
                </label>

              </div>

            </div>

            {/* ERROR MESSAGE */}
            {status.error && (
              <p className="login-error text-s text-red-600">
                {status.error}
              </p>
            )}

            {/* SUCCESS MESSAGE */}
            {status.success && (
              <p className="login-success text-s text-green-700">
                {status.success}
              </p>
            )}

            {/* SIGN UP BUTTON */}
            <button
              type="submit"
              disabled={status.loading}
              className="w-full bg-green-900 text-white text-xs font-medium py-3 rounded-lg hover:bg-green-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {status.loading ? 'Signing Up...' : 'Sign Up'}
            </button>

            {/* GOOGLE SIGN-UP: hidden when the admin turns Google sign-in off */}
            {settings.googleAuthEnabled && (
              <>
                {/* DIVIDER */}
                <div className="flex items-center gap-3 my-1">
                  <div className="flex-1 h-px bg-gray-200" />

                  <span className="text-xs text-gray-400">
                    or sign up with
                  </span>

                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* GOOGLE SIGN-UP */}
                <button
                  type="button"
                  onClick={handleGoogleSignUp}
                  disabled={status.loading}
                  className="google-signup-button w-full flex items-center justify-center gap-2 border border-gray-300 rounded-lg py-3 text-xs font-medium hover:bg-gray-50 transition mb-3 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <img
                    src={googleLogo}
                    alt="Google Icon"
                    className="google-icon h-4 w-4"
                  />

                  {status.loading
                    ? 'Connecting to Google...'
                    : 'Continue with Google'}

                </button>
              </>
            )}

          </form>

          {/* LOGIN REDIRECT */}
          <button
            type="button"
            onClick={() => navigate("/CustomerLogIn")}
            className="text-xs text-green-700 hover:text-green-800 transition"
          >
            <span className="text-gray-600">
              Already have an account?{" "}
            </span>

            Log In
          </button>

        </div>

        {/* RIGHT CARD */}
        <div
          style={{ flex: 0.4 }}
          className="relative overflow-hidden rounded-r-2xl px-8 pb-8 flex flex-col justify-start"
        >

          <div
            style={{
              flex: 0.4,
              backgroundImage: `url(${backgroundImage})`,
              backgroundSize: "cover",
              backgroundAttachment: "fixed",
              backgroundPosition: "center",
              opacity: 0.900
            }}
            className="absolute inset-0 scale-110 blur-sm pointer-events-none"
          ></div>

          <div className="relative z-10">

            <img
              src={logoImage}
              alt="Forrest Logo"
              className="w-[70px] h-[70px] rounded-full mb-6 mt-8"
            />

            <h2 className="text-2xl font-bold text-white leading-snug">
              Find your space.
            </h2>

            <h2 className="text-2xl font-bold text-white leading-snug mb-2">
              Find your focus.
            </h2>

            <h3 className="text-s text-white opacity-90">
              Focus. Connect. Grow
            </h3>

            <div className="mt-6 space-y-1">

              <h3 className="text-s text-white opacity-190">
                Forrest Co-working space is a
              </h3>

              <h3 className="text-s text-white opacity-190">
                study hub where you can find the
              </h3>

              <h3 className="text-s text-white opacity-190">
                perfect place to focus and grow.
              </h3>

              <h3 className="text-s text-white opacity-190">
                your ideas
              </h3>

            </div>

          </div>

        </div>

      </div>

    </div>
  )
}

export default CustomerSignUp