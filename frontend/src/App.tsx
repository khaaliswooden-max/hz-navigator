import { Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { MainLayout } from './components/Layout';

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

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';

function Compliance() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold text-gray-900">Compliance</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-gray-500">Compliance tracking coming soon...</p>
      </div>
    </div>
  );
}

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

function Verifications() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold text-gray-900">Verifications</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-gray-500">Verification queue coming soon...</p>
      </div>
    </div>
  );
}

function Reports() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold text-gray-900">Reports</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-gray-500">Reports and analytics coming soon...</p>
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
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-gray-500">Application settings coming soon...</p>
      </div>
    </div>
  );
}

function Notifications() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold text-gray-900">Notifications</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-gray-500">All notifications coming soon...</p>
      </div>
    </div>
  );
}

function App() {
  return (
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
          <Route path="compliance" element={<Compliance />} />
          <Route path="documents" element={<Documents />} />
          <Route path="check" element={<HubzoneCheck />} />
          <Route path="map" element={<MapExplorer />} />
          <Route path="certifications" element={<Certifications />} />
          <Route path="verifications" element={<Verifications />} />
          <Route path="reports" element={<Reports />} />
          <Route path="users" element={<Users />} />
          <Route path="audit-log" element={<AuditLog />} />
          <Route path="admin" element={<AdminConsole />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
          <Route path="notifications" element={<Notifications />} />
          
          {/* Catch all */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
