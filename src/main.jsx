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
import VerifyCode from './customerVerification.jsx'
import Dashboard from './dashboard.jsx'
import Customers from './Customers.jsx'
import LandingPage from './landingPage.jsx'
import StaffDashboard from './StaffDashboard.jsx'
import StaffCapsuleManagement from './StaffCapsuleManagement.jsx'
import StaffCapsuleAvailability from './StaffCapsuleAvailability.jsx'

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
        <Route path="/customerVerification" element={<VerifyCode />} />
        <Route path="/verify-code" element={<VerifyCode />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/StaffDashboard" element={<StaffDashboard/>}/>
        <Route path="/StaffCapsuleManagement" element={<StaffCapsuleManagement/>}/>
        <Route path="/StaffCapsuleAvailability" element={<StaffCapsuleAvailability/>}/>

       
        <Route path="/landingPage" element={<LandingPage />} />

        <Route path="*" element={<Navigate to="/landingPage" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
)