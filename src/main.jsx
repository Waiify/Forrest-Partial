import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'


import LandingPage from './LandingPage.jsx'
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
import StaffSpacesandServicesManagement from './StaffSpacesandServicesManagement.jsx'
import StaffSpacesandServicesAvailability from './StaffSpacesandServicesAvailability.jsx'
import AdminSettings from './AdminSettings.jsx'
import AdminReports from './AdminReports.jsx'
import StaffReservation from './StaffReservations.jsx'




createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
     <Routes>
        {/* Landing page (public home page) */}
        <Route path="/" element={<LandingPage />} />

        {/* Usa ra ka login para sa customer, staff, ug admin. */}
        <Route path="/login" element={<Login />} />

       
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
        <Route path="/settings" element={<AdminSettings />} />
        <Route path="/reports" element={<AdminReports />} />
       
        <Route path="/staff-dashboard" element={<StaffDashboard />} />
        <Route path="/StaffDashboard" element={<StaffDashboard />} />
        <Route path="/StaffSpacesandServicesManagement" element={<StaffSpacesandServicesManagement />} />
        <Route path="/StaffSpacesandServicesAvailability" element={<StaffSpacesandServicesAvailability />} />
        <Route path="/StaffReservation" element={<StaffReservation />} />
        <Route path="/customers" element={<Customers />} />

        {/* Management pages / Pages para sa management. */}
        <Route path="/management" element={<Management />} />
        <Route path="/staff-management" element={<Management />} />
        
        <Route path="/capsule" element={<AdminCapsule />} />
        <Route path="/capsules" element={<Navigate to="/capsule" replace />} />
        <Route path="/admincapsule" element={<AdminCapsule />} />

        {/* Fallback route / If no route matches, go to the landing page. */}
        <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </BrowserRouter>
  </StrictMode>,
)