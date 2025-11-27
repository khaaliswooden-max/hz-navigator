import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Link } from 'react-router-dom';
import { StatCard, ChartCard, ProgressCard, QuickActions } from '../../components/Dashboard';
import type { QuickAction } from '../../components/Dashboard';
import { useAuth } from '../../hooks/useAuth';

// Mock data
const verificationStatus = {
  status: 'verified',
  lastVerified: '2024-01-15',
  nextVerification: '2024-07-15',
  address: '123 Main St, Washington, DC 20001',
};

const jobMatchData = [
  { skill: 'Project Mgmt', matches: 24 },
  { skill: 'IT Services', matches: 18 },
  { skill: 'Engineering', matches: 15 },
  { skill: 'Consulting', matches: 12 },
  { skill: 'Finance', matches: 8 },
];

const recommendedJobs = [
  {
    id: '1',
    title: 'Senior Project Manager',
    company: 'Federal Solutions Inc.',
    location: 'Washington, DC',
    salary: '$95,000 - $120,000',
    hubzone: true,
    posted: '2 days ago',
    match: 95,
  },
  {
    id: '2',
    title: 'IT Consultant',
    company: 'TechGov Partners',
    location: 'Arlington, VA',
    salary: '$85,000 - $105,000',
    hubzone: true,
    posted: '3 days ago',
    match: 88,
  },
  {
    id: '3',
    title: 'Business Analyst',
    company: 'GovServ LLC',
    location: 'Remote',
    salary: '$70,000 - $90,000',
    hubzone: false,
    posted: '1 week ago',
    match: 82,
  },
];

const applications = [
  { id: '1', position: 'Senior Project Manager', company: 'Federal Solutions Inc.', status: 'interviewing', date: '2024-01-10' },
  { id: '2', position: 'Program Coordinator', company: 'Capitol Contractors', status: 'applied', date: '2024-01-12' },
  { id: '3', position: 'Operations Manager', company: 'DC Services Group', status: 'reviewed', date: '2024-01-08' },
];

const profileData = {
  completionPercentage: 75,
  missingFields: ['Skills Assessment', 'References', 'Portfolio'],
};

const quickActions: QuickAction[] = [
  {
    id: '1',
    label: 'Update Address',
    description: 'Verify your current residence',
    to: '/profile/address',
    variant: 'primary',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: '2',
    label: 'Browse Jobs',
    description: 'Find HUBZone opportunities',
    to: '/jobs',
    variant: 'default',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: '3',
    label: 'Complete Profile',
    description: 'Add missing information',
    to: '/profile',
    variant: 'default',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    id: '4',
    label: 'My Applications',
    description: 'Track your job applications',
    to: '/applications',
    variant: 'default',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
];

const statusStyles = {
  applied: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Applied' },
  reviewed: { bg: 'bg-hubzone-100', text: 'text-hubzone-700', label: 'Under Review' },
  interviewing: { bg: 'bg-verified-100', text: 'text-verified-700', label: 'Interviewing' },
  offered: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Offer Received' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Not Selected' },
};

export default function ProfessionalDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">
            Welcome back, {user?.firstName}
          </h1>
          <p className="text-gray-500 mt-1">
            Find HUBZone job opportunities that match your skills
          </p>
        </div>
      </div>

      {/* Verification status banner */}
      <div className={`rounded-xl p-5 ${verificationStatus.status === 'verified' ? 'bg-verified-50 border border-verified-200' : 'bg-amber-50 border border-amber-200'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${verificationStatus.status === 'verified' ? 'bg-verified-100' : 'bg-amber-100'}`}>
              {verificationStatus.status === 'verified' ? (
                <svg className="w-6 h-6 text-verified-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>
            <div>
              <h3 className={`font-semibold ${verificationStatus.status === 'verified' ? 'text-verified-900' : 'text-amber-900'}`}>
                {verificationStatus.status === 'verified' ? 'HUBZone Residency Verified' : 'Verification Needed'}
              </h3>
              <p className={`text-sm mt-1 ${verificationStatus.status === 'verified' ? 'text-verified-700' : 'text-amber-700'}`}>
                {verificationStatus.address}
              </p>
              <p className={`text-xs mt-1 ${verificationStatus.status === 'verified' ? 'text-verified-600' : 'text-amber-600'}`}>
                Next verification due: {new Date(verificationStatus.nextVerification).toLocaleDateString()}
              </p>
            </div>
          </div>
          <Link
            to="/check"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${verificationStatus.status === 'verified' ? 'bg-verified-600 text-white hover:bg-verified-700' : 'bg-amber-600 text-white hover:bg-amber-700'}`}
          >
            {verificationStatus.status === 'verified' ? 'Re-verify Address' : 'Verify Now'}
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Job Matches"
          value={77}
          change="+12 this week"
          trend="up"
          color="blue"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
        />
        <StatCard
          label="Active Applications"
          value={3}
          change="1 interviewing"
          trend="neutral"
          color="green"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <StatCard
          label="Profile Views"
          value={28}
          change="+8 this month"
          trend="up"
          color="purple"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          }
        />
        <StatCard
          label="Saved Jobs"
          value={12}
          color="amber"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          }
        />
      </div>

      {/* Jobs and Chart row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Job recommendations */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Recommended Jobs</h3>
            <Link
              to="/jobs"
              className="text-sm font-medium text-hubzone-600 hover:text-hubzone-700"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recommendedJobs.map((job) => (
              <div key={job.id} className="p-5 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{job.title}</h4>
                      {job.hubzone && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-hubzone-100 text-hubzone-700 rounded-full">
                          HUBZone
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{job.company}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        {job.location}
                      </span>
                      <span>{job.salary}</span>
                      <span>{job.posted}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-hubzone-600">{job.match}%</div>
                    <p className="text-xs text-gray-500">match</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Skills match chart */}
        <ChartCard title="Job Matches by Skill" height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={jobMatchData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
              <XAxis type="number" stroke="#6b7280" fontSize={12} />
              <YAxis type="category" dataKey="skill" stroke="#6b7280" fontSize={12} width={80} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="matches" fill="#0073c7" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Applications and Profile row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Application status */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Application Status</h3>
            <Link
              to="/applications"
              className="text-sm font-medium text-hubzone-600 hover:text-hubzone-700"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {applications.map((app) => {
              const status = statusStyles[app.status as keyof typeof statusStyles];
              return (
                <div key={app.id} className="px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{app.position}</p>
                    <p className="text-sm text-gray-500">{app.company}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${status.bg} ${status.text}`}>
                      {status.label}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(app.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Profile completion */}
        <div className="space-y-4">
          <ProgressCard
            title="Profile Completion"
            value={profileData.completionPercentage}
            max={100}
            label="Complete your profile to improve job matches"
            color="purple"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
          />

          {/* Missing fields */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Complete These Sections</h4>
            <ul className="space-y-2">
              {profileData.missingFields.map((field) => (
                <li key={field} className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-gray-300" />
                  </div>
                  <span className="text-gray-600">{field}</span>
                  <Link to="/profile" className="ml-auto text-hubzone-600 hover:text-hubzone-700 font-medium">
                    Add
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <QuickActions
        actions={quickActions}
        title="Quick Actions"
        layout="grid"
        columns={4}
      />
    </div>
  );
}

