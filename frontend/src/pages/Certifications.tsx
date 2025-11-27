import { useState } from 'react';
import { clsx } from 'clsx';

type TabType = 'overview' | 'applications' | 'documents';

interface Application {
  id: string;
  businessName: string;
  status: 'pending' | 'under_review' | 'approved' | 'denied';
  submittedAt: string;
  lastUpdated: string;
}

const mockApplications: Application[] = [
  {
    id: 'APP-2024-001',
    businessName: 'Acme Solutions LLC',
    status: 'under_review',
    submittedAt: '2024-01-15',
    lastUpdated: '2024-01-20',
  },
  {
    id: 'APP-2024-002',
    businessName: 'Tech Innovations Inc',
    status: 'pending',
    submittedAt: '2024-01-18',
    lastUpdated: '2024-01-18',
  },
  {
    id: 'APP-2023-089',
    businessName: 'Green Energy Partners',
    status: 'approved',
    submittedAt: '2023-11-05',
    lastUpdated: '2023-12-15',
  },
];

const statusStyles = {
  pending: 'badge-warning',
  under_review: 'badge-info',
  approved: 'badge-success',
  denied: 'badge-error',
};

const statusLabels = {
  pending: 'Pending',
  under_review: 'Under Review',
  approved: 'Approved',
  denied: 'Denied',
};

function Certifications() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  return (
    <div className="space-y-6 animate-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-gray-900">Certifications</h1>
          <p className="mt-1 text-gray-600">
            Manage your HUBZone certification applications
          </p>
        </div>
        <button className="btn-primary">+ New Application</button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'applications', label: 'Applications' },
            { id: 'documents', label: 'Documents' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={clsx(
                'pb-4 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-hubzone-600 text-hubzone-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Stats */}
          <div className="card bg-gradient-to-br from-hubzone-500 to-hubzone-600 text-white">
            <p className="text-hubzone-100 text-sm">Active Certifications</p>
            <p className="text-4xl font-bold mt-2">1</p>
            <p className="text-hubzone-200 text-sm mt-2">Valid until Dec 2025</p>
          </div>
          <div className="card">
            <p className="text-gray-500 text-sm">Pending Applications</p>
            <p className="text-4xl font-bold text-gray-900 mt-2">2</p>
            <p className="text-gray-500 text-sm mt-2">Avg. 18 days to review</p>
          </div>
          <div className="card">
            <p className="text-gray-500 text-sm">Documents Required</p>
            <p className="text-4xl font-bold text-amber-600 mt-2">3</p>
            <a href="#" className="link text-sm mt-2 inline-block">
              Upload now →
            </a>
          </div>

          {/* Recent activity */}
          <div className="card md:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Activity
            </h2>
            <div className="space-y-4">
              {[
                { action: 'Application submitted', date: 'Jan 18, 2024', icon: '📄' },
                { action: 'Document uploaded', date: 'Jan 17, 2024', icon: '📎' },
                { action: 'Review started', date: 'Jan 20, 2024', icon: '👁️' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 text-sm">
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-gray-900">{item.action}</span>
                  <span className="text-gray-500 ml-auto">{item.date}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Links
            </h2>
            <div className="space-y-2">
              <a href="#" className="block text-sm link">
                📋 Certification requirements
              </a>
              <a href="#" className="block text-sm link">
                📖 Application guide
              </a>
              <a href="#" className="block text-sm link">
                ❓ FAQs
              </a>
              <a href="#" className="block text-sm link">
                📞 Contact support
              </a>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'applications' && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Application ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Business Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {mockApplications.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-gray-900">
                      {app.id}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {app.businessName}
                  </td>
                  <td className="px-6 py-4">
                    <span className={statusStyles[app.status]}>
                      {statusLabels[app.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {app.submittedAt}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {app.lastUpdated}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="btn-ghost text-sm">View →</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="card">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
            <div className="text-4xl mb-4">📁</div>
            <h3 className="text-lg font-semibold text-gray-900">
              Upload Documents
            </h3>
            <p className="text-gray-500 mt-1 mb-4">
              Drag and drop files here, or click to browse
            </p>
            <button className="btn-secondary">Browse Files</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Certifications;

