import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

import { auth } from "./firebase.js"; // usba kung lahi ang export name sa imong firebase.js
import pageBackground from "./assets/page_background.jpeg";
import logo from "./assets/logo.jpg";

// Address sa backend server
const API_URL = "http://localhost:5000";

// Asa i-redirect ang user base sa role.
// USBA ang mga path ngadto sa tinuod nimong routes sa main.jsx.
const ROLE_ROUTES = {
  admin: "/dashboard",
  staff: "/staff-dashboard",
  customer: "",
};


export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [needsAdminCode, setNeedsAdminCode] = useState(false); // makita ra kung admin
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // I-save ang user ug i-redirect base sa role
  function finishLogin(user) {
    localStorage.setItem("user", JSON.stringify(user)); // usba ang key kung lahi sa imong dashboards
    navigate(ROLE_ROUTES[user.role] ?? "/");
  }

  // Email + password login (customer, staff, admin)
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, adminCode }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Login failed.");
        return;
      }

      // Admin ang account, kinahanglan pa ang admin code
      if (data.requiresAdminCode) {
        setNeedsAdminCode(true);
        return;
      }

      finishLogin(data.user);
    } catch {
      setError("Cannot reach the server. Make sure it is running.");
    } finally {
      setLoading(false);
    }
  }

  // Google sign-in (para sa customers)
  async function handleGoogle() {
    setError("");
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
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

      finishLogin(data.user);
    } catch {
      setError("Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
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
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={needsAdminCode}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm outline-none focus:border-slate-400 disabled:bg-slate-100"
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="login-password">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={needsAdminCode}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm outline-none focus:border-slate-400 disabled:bg-slate-100"
              />
            </div>

            {/* Admin code: makita ra kung admin ang account */}
            {needsAdminCode && (
              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="login-admin-code">
                  Admin code
                </label>
                <input
                  id="login-admin-code"
                  type="password"
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  required
                  autoFocus
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm outline-none focus:border-slate-400"
                />
              </div>
            )}

            {/* Log in button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#003F22] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? "Please wait..." : needsAdminCode ? "Verify admin code" : "Log in"}
            </button>
          </form>

          {/* Google sign-in: tago kung admin code step na */}
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
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z" />
                  <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
                  <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.1 1.4-4.9 2.3-8.2 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
                </svg>
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
          <img
            src={logo}
            alt="Logo"
            className="w-20 h-20 object-contain mb-4 rounded-full"
          />
          <br></br>
          <h1 className="text-2xl font-bold mb-3 text-white">Find your space.</h1>
          <h1 className="text-2xl font-bold mb-3 text-white">Find your focus.</h1>
          <p className="text-white">Focus.Connect.Grow</p>
          <br></br>
          <p className="text-slate-800 text-white">Forrest Co-working space is a study hub where you can find the perfect place to focus and grow your ideas.</p>
        </div>
      </div>
    </div>
  );
}