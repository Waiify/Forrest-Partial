import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import "./installUserHeader.js";
import StaffPermissionGate from './components/StaffPermissionGate.jsx'


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
import StaffReservationHistory from './StaffReservationHistory.jsx'
import StaffQRScanner from './StaffQRScanner.jsx'
import AdminauditLogs from './AdminauditLogs.jsx'
import StaffLogs from './StaffLogs.jsx'

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
        <Route path="/dashboard" element={<StaffPermissionGate resource="adminOnly" action="view" fallback="/StaffDashboard"><Dashboard /></StaffPermissionGate>} />
        <Route path="/adminDashboard" element={<Navigate to="/dashboard" replace />} />
        <Route path="/customer-dashboard" element={<CustomerDashboard />} />
        <Route path="/reservation" element={<StaffPermissionGate resource="adminOnly" action="view" fallback="/StaffReservation"><AdminReservation /></StaffPermissionGate>} />
        <Route path="/AdminReservation" element={<Navigate to="/reservation" replace />} />
        <Route path="/settings" element={<StaffPermissionGate resource="adminOnly" action="view"><AdminSettings /></StaffPermissionGate>} />
        <Route path="/reports" element={<StaffPermissionGate resource="reports" action="view"><AdminReports /></StaffPermissionGate>} />
        <Route path="/audit-logs" element={<StaffPermissionGate resource="auditLogs" action="view"><AdminauditLogs /></StaffPermissionGate>} />
       
        <Route path="/staff-dashboard" element={<StaffPermissionGate resource="dashboard" action="view"><StaffDashboard /></StaffPermissionGate>} />
        <Route path="/StaffDashboard" element={<StaffPermissionGate resource="dashboard" action="view"><StaffDashboard /></StaffPermissionGate>} />
        <Route path="/StaffSpacesandServicesManagement" element={<StaffPermissionGate resource="spaces" action="view"><StaffSpacesandServicesManagement /></StaffPermissionGate>} />
        <Route path="/StaffSpacesandServicesAvailability" element={<StaffPermissionGate resource="spaces" action="view"><StaffSpacesandServicesAvailability /></StaffPermissionGate>} />
        <Route path="/StaffReservation" element={<StaffPermissionGate resource="reservations" action="view"><StaffReservation /></StaffPermissionGate>} />
        <Route path="/StaffReservationHistory" element={<StaffPermissionGate resource="reservations" action="view"><StaffReservationHistory /></StaffPermissionGate>} />
        <Route path="/StaffQRScanner" element={<StaffPermissionGate resource="reservations" action="update"><StaffQRScanner /></StaffPermissionGate>} />
        <Route path="/StaffSystemLogs" element={<StaffLogs />} />
        <Route path="/customers" element={<StaffPermissionGate resource="customers" action="view"><Customers /></StaffPermissionGate>} />

        {/* Management pages / Pages para sa management. */}
        <Route path="/management" element={<StaffPermissionGate resource="adminOnly" action="view"><Management /></StaffPermissionGate>} />
        <Route path="/staff-management" element={<StaffPermissionGate resource="adminOnly" action="view"><Management /></StaffPermissionGate>} />
        
        <Route path="/capsule" element={<StaffPermissionGate resource="adminOnly" action="view" fallback="/StaffSpacesandServicesManagement"><AdminCapsule /></StaffPermissionGate>} />
        <Route path="/capsules" element={<Navigate to="/capsule" replace />} />
        <Route path="/admincapsule" element={<StaffPermissionGate resource="adminOnly" action="view" fallback="/StaffSpacesandServicesManagement"><AdminCapsule /></StaffPermissionGate>} />

        {/* Fallback route / If no route matches, go to the landing page. */}
        <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </BrowserRouter>
  </StrictMode>,
)