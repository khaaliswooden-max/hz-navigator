import { Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { MainLayout } from './components/Layout/index';
import { ErrorBoundary, ToastContainer } from './components/Common';
import { ToastProvider } from './context/ToastContext';
import { NotificationCenter } from './components/Notifications';

// Pages
import Dashboard from './pages/Dashboard/index';
import HubzoneCheck from './pages/HubzoneCheck';
import MapExplorer from './pages/MapExplorer';
import Certifications from './pages/Certifications';
import NotFound from './pages/NotFound';

// Business Pages
import { BusinessList, BusinessProfile, BusinessCreate, Ownership } from './pages/Business';

// Employee Pages
import { EmployeeList } from './pages/Employees';

// Compliance Pages
import { ComplianceDashboard, ComplianceAlerts, ComplianceReports } from './pages/Compliance';
import { NotificationPreferences } from './components/Compliance';

// Map Pages
import { TractDetail } from './pages/Map';

// Agency Pages
import { ContractorVerification, Goals, Contracts, Reports, Analytics } from './pages/Agency';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';

function Documents() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold text-gray-900">Documents</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-gray-500">Document management coming soon...</p>
      </div>
    </div>
  );
}



function Users() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold text-gray-900">User Management</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-gray-500">User management coming soon...</p>
      </div>
    </div>
  );
}

function AuditLog() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold text-gray-900">Audit Log</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-gray-500">Audit log coming soon...</p>
      </div>
    </div>
  );
}

function AdminConsole() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold text-gray-900">Admin Console</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-gray-500">Admin console coming soon...</p>
      </div>
    </div>
  );
}

function Profile() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold text-gray-900">My Profile</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-gray-500">Profile settings coming soon...</p>
      </div>
    </div>
  );
}

function Settings() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold text-gray-900">Settings</h1>
      
      {/* Notification Preferences */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <NotificationPreferences />
      </div>

      {/* Other Settings placeholder */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Settings</h2>
        <p className="text-sm text-gray-500">Additional account settings coming soon...</p>
      </div>
    </div>
  );
}


function App() {
  return (
    <ErrorBoundary>
      <ToastProvider position="top-right">
        <AuthProvider>
          <Routes>
        {/* Public Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        {/* Protected Routes with Main Layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          {/* Redirect root to dashboard */}
          <Route index element={<Navigate to="/dashboard" replace />} />
          
          {/* Main pages */}
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="businesses" element={<BusinessList />} />
          <Route path="businesses/new" element={<BusinessCreate />} />
          <Route path="businesses/:id" element={<BusinessProfile />} />
          <Route path="businesses/:id/ownership" element={<Ownership />} />
          <Route path="employees" element={<EmployeeList />} />
          <Route path="compliance" element={<ComplianceDashboard />} />
          <Route path="compliance/alerts" element={<ComplianceAlerts />} />
          <Route path="documents" element={<Documents />} />
          <Route path="check" element={<HubzoneCheck />} />
          <Route path="map" element={<MapExplorer />} />
          <Route path="hubzone/tract/:tractId" element={<TractDetail />} />
          <Route path="certifications" element={<Certifications />} />
          <Route path="verifications" element={<ContractorVerification />} />
          <Route path="agency/verify" element={<ContractorVerification />} />
          <Route path="agency/goals" element={<Goals />} />
          <Route path="agency/contracts" element={<Contracts />} />
          <Route path="agency/reports" element={<Reports />} />
          <Route path="agency/analytics" element={<Analytics />} />
          <Route path="reports" element={<ComplianceReports />} />
          <Route path="compliance/reports" element={<ComplianceReports />} />
          <Route path="users" element={<Users />} />
          <Route path="audit-log" element={<AuditLog />} />
          <Route path="admin" element={<AdminConsole />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
          <Route path="notifications" element={<NotificationCenter />} />
          
          {/* Catch all */}
          <Route path="*" element={<NotFound />} />
          </Route>
          </Routes>
        </AuthProvider>
          <ToastContainer />
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
