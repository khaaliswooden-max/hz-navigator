import { useAuth } from '../../hooks/useAuth';
import BusinessOwnerDashboard from './BusinessOwnerDashboard';
import ProfessionalDashboard from './ProfessionalDashboard';
import AgencyDashboard from './AgencyDashboard';
import AdminDashboard from './AdminDashboard';

/**
 * Main Dashboard component that renders role-specific dashboards
 * 
 * Role mapping:
 * - 'user' role -> BusinessOwnerDashboard (default for regular users)
 * - 'reviewer' role -> AgencyDashboard (for SBA reviewers)
 * - 'admin' role -> AdminDashboard (for system administrators)
 * 
 * Note: ProfessionalDashboard is available for users who are
 * individual professionals rather than business owners.
 * This can be toggled via user preferences or account type.
 */
export default function Dashboard() {
  const { user, isAdmin, isReviewer } = useAuth();

  // Loading state - show skeleton
  if (!user) {
    return <DashboardSkeleton />;
  }

  // Admin gets the admin dashboard
  if (isAdmin) {
    return <AdminDashboard />;
  }

  // Reviewers get the agency dashboard
  if (isReviewer) {
    return <AgencyDashboard />;
  }

  // Default: regular users get business owner dashboard
  // In the future, this could check a user preference for ProfessionalDashboard
  return <BusinessOwnerDashboard />;
}

/**
 * Skeleton loader for dashboard
 */
function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="h-8 w-64 bg-gray-200 rounded-lg" />
          <div className="h-4 w-48 bg-gray-200 rounded mt-2" />
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="h-8 w-32 bg-gray-200 rounded mt-2" />
            <div className="h-4 w-20 bg-gray-200 rounded mt-2" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
          <div className="h-64 bg-gray-100 rounded-lg" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
          <div className="h-64 bg-gray-100 rounded-lg" />
        </div>
      </div>

      {/* Additional sections skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="h-6 w-40 bg-gray-200 rounded" />
            </div>
            <div className="p-5 space-y-4">
              {[1, 2, 3].map((j) => (
                <div key={j} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                  <div className="flex-1">
                    <div className="h-4 w-32 bg-gray-200 rounded" />
                    <div className="h-3 w-24 bg-gray-200 rounded mt-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Re-export individual dashboards for direct access if needed
export { BusinessOwnerDashboard, ProfessionalDashboard, AgencyDashboard, AdminDashboard };

