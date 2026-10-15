import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'


import Login from './loginPage.jsx'
import StaffSignup from './staffSignup.jsx'
import CustomerSignUp from './CustomerSignUp.jsx'
import ResetPassword from './customerResetpass.jsx'
import SetNewPassword from './setNewPassword'
import VerifyCode from './customerVerification.jsx'
import Dashboard from './admindashboard.jsx'
import CustomerDashboard from './customerdashboard.jsx'
import Customers from './Customers.jsx'
import Management from './Management.jsx'
import AdminCapsule from './admincapsule.jsx'
import AdminReservation from './AdminReservation.jsx'
import StaffDashboard from './StaffDashboard.jsx'
import StaffCapsuleManagement from './StaffCapsuleManagement.jsx'
import StaffCapsuleAvailability from './StaffCapsuleAvailability.jsx'





createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
     <Routes>
        {/* Directly open the login page / Direkta nga abli ang login page. */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Usa ra ka login para sa customer, staff, ug admin. */}
        <Route path="/login" element={<Login />} />

        {/* Old login routes: i-redirect sa bag-ong /login aron dili mabali ang old links. */}
        <Route path="/adminLogin" element={<Navigate to="/login" replace />} />
        <Route path="/staffLogin" element={<Navigate to="/login" replace />} />
        <Route path="/CustomerLogIn" element={<Navigate to="/login" replace />} />

        {/* Signup, reset password, ug verification. */}
        <Route path="/staffSignup" element={<StaffSignup />} />
        <Route path="/CustomerSignUp" element={<CustomerSignUp />} />
        <Route path="/customerResetpass" element={<ResetPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/set-new-password" element={<SetNewPassword />} />
        <Route path="/customerVerification" element={<VerifyCode />} />
        <Route path="/verify-code" element={<VerifyCode />} />

        {/* Dashboard and customer pages / Dashboard ug customer pages. */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/adminDashboard" element={<Navigate to="/dashboard" replace />} />
        <Route path="/customer-dashboard" element={<CustomerDashboard />} />
        <Route path="/reservation" element={<AdminReservation />} />
        <Route path="/AdminReservation" element={<Navigate to="/reservation" replace />} />
        <Route path="/staff-dashboard" element={<StaffDashboard />} />
        <Route path="/StaffDashboard" element={<StaffDashboard />} />
        <Route path="/StaffCapsuleManagement" element={<StaffCapsuleManagement />} />
        <Route path="/StaffCapsuleAvailability" element={<StaffCapsuleAvailability />} />
        <Route path="/customers" element={<Customers />} />

        {/* Management pages / Pages para sa management. */}
        <Route path="/management" element={<Management />} />
        <Route path="/staff-management" element={<Management />} />
        
        <Route path="/capsule" element={<AdminCapsule />} />
        <Route path="/capsules" element={<Navigate to="/capsule" replace />} />
        <Route path="/admincapsule" element={<AdminCapsule />} />

        {/* Fallback route / If no route matches, go back to login page. */}
        <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
    </BrowserRouter>
  </StrictMode>,
)