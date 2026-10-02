import { useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signInWithPopup } from "firebase/auth";
import ReCAPTCHA from "react-google-recaptcha";
import { Eye, EyeOff, Mail, Lock, KeyRound } from "lucide-react";

import { auth, googleProvider } from "./firebase";
import pageBackground from "./assets/page_background.jpeg"; // usba kung .jpg ang tinuod nimong file
import logo from "./assets/logo.jpg";
import googleImage from "./assets/G-logo.png";

// Address sa backend server
const API_URL = "http://localhost:5000";

// Asa i-redirect ang user base sa role.
// USBA ang mga path ngadto sa tinuod nimong routes sa main.jsx.
const ROLE_ROUTES = {
  admin: "/dashboard",
  staff: "/staff-dashboard",
  customer: "/dashboard",
};

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white/80 py-3 text-sm outline-none focus:border-slate-400 disabled:bg-slate-100";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [adminCode, setAdminCode] = useState("");
  const [needsAdminCode, setNeedsAdminCode] = useState(false); // makita ra kung admin
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const recaptchaRef = useRef(null);
  const [captchaToken, setCaptchaToken] = useState(null);

  function resetCaptcha() {
    recaptchaRef.current?.reset();
    setCaptchaToken(null);
  }

  // Ok ra kung na-tick ang CAPTCHA ug gi-confirm sa Google (via backend)
  async function verifyCaptcha() {
    if (!captchaToken) {
      return { ok: false, message: "Please complete the CAPTCHA." };
    }
    try {
      const res = await fetch(`${API_URL}/verify-captcha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: captchaToken }),
      });
      const data = await res.json();
      if (!data.success) {
        resetCaptcha();
        return { ok: false, message: "CAPTCHA failed. Please try again." };
      }
      return { ok: true };
    } catch (err) {
      console.error("Captcha fetch error:", err);
      return { ok: false, message: "Could not verify CAPTCHA. Please try again." };
    }
  }

  // I-save ang session ug i-redirect base sa role
  function finishLogin(data) {
    if (data.token) sessionStorage.setItem("token", data.token);
    sessionStorage.setItem("user", JSON.stringify(data.user));
    navigate(ROLE_ROUTES[data.user.role] ?? "/");
  }

  // Gamiton sa email login ug Google login: i-handle ang tanang posibleng response
  // Return true kung human na ang flow (redirect o next step), false kung dili pa
  function handleAuthResponse(data, { fromGoogle = false } = {}) {
    // Staff: kinahanglan pa ang staff code sa lahi nga page
    if (data.needsStaffCode) {
      sessionStorage.setItem("pendingToken", data.tempToken);
      navigate("/StaffCode");
      return;
    }

    // Admin: kinahanglan pa ang admin code
    if (data.requiresAdminCode || data.needsAdminCode) {
      if (fromGoogle) {
        setError("Admins must sign in with email and password.");
      } else {
        setNeedsAdminCode(true);
      }
      return;
    }

    finishLogin(data);
  }

  // Email + password login (customer, staff, admin)
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // Ang CAPTCHA gi-check na sa first step, dili na balikon sa admin code step
    if (!needsAdminCode) {
      const captcha = await verifyCaptcha();
      if (!captcha.ok) {
        setError(captcha.message);
        return;
      }
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, adminCode }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Login failed.");
        return;
      }

      handleAuthResponse(data);
    } catch {
      setError("Cannot reach the server. Make sure it is running.");
    } finally {
      // Single-use ang CAPTCHA token, mao i-reset para makasulay pa ang user
      if (!needsAdminCode) resetCaptcha();
      setLoading(false);
    }
  }

  // Google sign-in
  async function handleGoogle() {
    setError("");

    const captcha = await verifyCaptcha();
    if (!captcha.ok) {
      setError(captcha.message);
      return;
    }

    setLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      const res = await fetch(`${API_URL}/api/auth/google-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Google sign-in failed.");
        return;
      }

      handleAuthResponse(data, { fromGoogle: true });
    } catch (err) {
      console.error("Google login error:", err);
      setError("Google sign-in failed. Please try again.");
    } finally {
      resetCaptcha();
      setLoading(false);
    }
  }

  // Balik sa first step kung sayop ang account nga gi-type
  function backToLogin() {
    setNeedsAdminCode(false);
    setAdminCode("");
    setPassword("");
    setError("");
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center bg-white bg-cover bg-center bg-no-repeat p-6"
      style={{ backgroundImage: `url(${pageBackground})` }}
    >
      <div className="flex border-2 border-black w-full max-w-5xl h-[600px] rounded-2xl shadow-lg overflow-hidden">
        {/* Left panel: login form */}
        <div className="w-3/5 p-6 bg-white/80 overflow-y-auto">
          <h1 className="text-2xl text-[#003F22] font-bold mb-3">Welcome to Forrest Co-Working space</h1>
          <p className="text-sm text-slate-600 mb-3">Sign in to continue.</p>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Error message */}
            {error && (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="login-email">
                Email
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="youremail@gmail.com"
                  required
                  disabled={needsAdminCode}
                  className={`${inputClass} pl-10 pr-3`}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="login-password">
                Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  disabled={needsAdminCode}
                  className={`${inputClass} pl-10 pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={needsAdminCode}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-green-800"
                >
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </div>

            {/* Admin code: makita ra kung admin ang account */}
            {needsAdminCode && (
              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="login-admin-code">
                  Admin code
                </label>
                <div className="relative">
                  <KeyRound size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="login-admin-code"
                    type="password"
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                    required
                    autoFocus
                    className={`${inputClass} pl-10 pr-3`}
                  />
                </div>
              </div>
            )}

            {/* Forgot password + CAPTCHA: tago kung admin code step na */}
            {!needsAdminCode && (
              <>
                <div className="flex justify-end">
                  <Link to="/reset-password" className="text-xs font-medium text-[#003F22] hover:underline">
                    Forgot Password?
                  </Link>
                </div>

                <div className="flex justify-center" style={{ height: 66 }}>
                  <div style={{ transform: "scale(0.85)", transformOrigin: "top center" }}>
                    <ReCAPTCHA
                      ref={recaptchaRef}
                      sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                      onChange={(token) => setCaptchaToken(token)}
                      onExpired={() => setCaptchaToken(null)}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Log in button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#003F22] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? "Please wait..." : needsAdminCode ? "Verify admin code" : "Log in"}
            </button>

            {needsAdminCode && (
              <button
                type="button"
                onClick={backToLogin}
                className="w-full text-center text-xs font-medium text-slate-600 hover:underline"
              >
                Use a different account
              </button>
            )}
          </form>

          {/* Google sign-in + sign up: tago kung admin code step na */}
          {!needsAdminCode && (
            <>
              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-300" />
                <span className="text-xs text-slate-500">or</span>
                <div className="h-px flex-1 bg-slate-300" />
              </div>

              <button
                type="button"
                onClick={handleGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm hover:shadow-md hover:bg-white transition disabled:opacity-50"
              >
                <img src={googleImage} alt="" className="h-4 w-4" />
                Continue with Google
              </button>

              <p className="mt-4 text-center text-sm text-slate-600">
                No account yet?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/CustomerSignUp")}
                  className="font-semibold text-[#003F22] hover:underline"
                >
                  Sign up
                </button>
              </p>
            </>
          )}
        </div>

        {/* Right panel: static description */}
        <div className="w-2/5 backdrop-blur-sm p-6">
          <img src={logo} alt="Forrest logo" className="w-20 h-20 object-contain mb-4 rounded-full" />
          <br />
          <h1 className="text-2xl font-bold mb-3 text-white">Find your space.</h1>
          <h1 className="text-2xl font-bold mb-3 text-white">Find your focus.</h1>
          <p className="text-white">Focus. Connect. Grow</p>
          <br />
          <p className="text-white">
            Forrest Co-working space is a study hub where you can find the perfect place to focus and grow your ideas.
          </p>
        </div>
      </div>
    </div>
  );
}