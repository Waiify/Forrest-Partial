import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import AdminLogin from './adminLogin.jsx'
import StaffLogin from './staffLogin.jsx'
import StaffSignup from './staffSignup.jsx'
import CustomerLogIn from './CustomerLogIn.jsx'
import CustomerSignUp from './CustomerSignUp.jsx'
import ResetPassword from './customerResetpass.jsx'
import SetNewPassword from './setNewPassword'
import VerifyCode from './customerVerification.jsx'
import Dashboard from './dashboard.jsx'
import Customers from './Customers.jsx'
import LandingPage from './landingPage.jsx'



createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
     <Routes>
        <Route path="/" element={<Navigate to="/landingPage" replace />} />
        <Route path="/adminLogin" element={<AdminLogin />} />
        <Route path="/staffLogin" element={<StaffLogin />} />
        <Route path="/staffSignup" element={<StaffSignup />} />
        <Route path="/CustomerSignUp" element={<CustomerSignUp />} />
        <Route path="/CustomerLogIn" element={<CustomerLogIn />} />
        <Route path="/customerResetpass" element={<ResetPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/set-new-password" element={<SetNewPassword />} />
        <Route path="/customerVerification" element={<VerifyCode />} />
        <Route path="/verify-code" element={<VerifyCode />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/landingPage" element={<LandingPage />} />
        <Route path="*" element={<Navigate to="/landingPage" replace />} />
    </Routes>
    </BrowserRouter>
  </StrictMode>,
)