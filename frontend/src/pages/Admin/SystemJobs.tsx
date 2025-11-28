/**
 * System Jobs Page
 * View job queue, retry failed jobs, schedule one-time jobs, view history
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { SystemJob, JobStatus } from '../../types/admin';

// Mock data
const mockJobs: SystemJob[] = [
  {
    id: 'job-001',
    name: 'HUBZone Map Data Sync',
    type: 'scheduled',
    status: 'completed',
    progress: 100,
    startedAt: '2024-01-20T02:00:00Z',
    completedAt: '2024-01-20T02:45:00Z',
    nextRun: '2024-02-01T02:00:00Z',
    cronExpression: '0 2 1 * *',
    result: { success: true, recordsProcessed: 234, errors: 0 },
  },
  {
    id: 'job-002',
    name: 'Compliance Score Recalculation',
    type: 'scheduled',
    status: 'running',
    progress: 65,
    startedAt: '2024-01-21T03:00:00Z',
    completedAt: null,
    nextRun: null,
    cronExpression: '0 3 * * *',
    result: undefined,
  },
  {
    id: 'job-003',
    name: 'Document OCR Processing',
    type: 'triggered',
    status: 'pending',
    progress: 0,
    startedAt: null,
    completedAt: null,
    nextRun: null,
    metadata: { documentsQueued: 45 },
  },
  {
    id: 'job-004',
    name: 'Email Notification Batch',
    type: 'scheduled',
    status: 'failed',
    progress: 32,
    startedAt: '2024-01-21T01:00:00Z',
    completedAt: '2024-01-21T01:15:00Z',
    nextRun: '2024-01-22T01:00:00Z',
    cronExpression: '0 1 * * *',
    result: { success: false, message: 'SMTP connection timeout', recordsProcessed: 156, errors: 3 },
  },
  {
    id: 'job-005',
    name: 'Certification Expiration Check',
    type: 'scheduled',
    status: 'completed',
    progress: 100,
    startedAt: '2024-01-21T00:00:00Z',
    completedAt: '2024-01-21T00:12:00Z',
    nextRun: '2024-01-22T00:00:00Z',
    cronExpression: '0 0 * * *',
    result: { success: true, recordsProcessed: 23841, errors: 0, message: '12 certifications expiring within 30 days' },
  },
  {
    id: 'job-006',
    name: 'Audit Log Cleanup',
    type: 'scheduled',
    status: 'completed',
    progress: 100,
    startedAt: '2024-01-20T04:00:00Z',
    completedAt: '2024-01-20T04:25:00Z',
    nextRun: '2024-02-20T04:00:00Z',
    cronExpression: '0 4 20 * *',
    result: { success: true, recordsProcessed: 45000, message: 'Deleted 45000 records older than 90 days' },
  },
  {
    id: 'job-007',
    name: 'Database Backup',
    type: 'scheduled',
    status: 'completed',
    progress: 100,
    startedAt: '2024-01-21T05:00:00Z',
    completedAt: '2024-01-21T05:35:00Z',
    nextRun: '2024-01-22T05:00:00Z',
    cronExpression: '0 5 * * *',
    result: { success: true, message: 'Backup size: 4.2GB' },
  },
];

const jobStatusColors: Record<JobStatus, string> = {
  pending: 'bg-gray-100 text-gray-800',
  running: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

const jobTypeColors: Record<string, string> = {
  scheduled: 'bg-purple-100 text-purple-800',
  manual: 'bg-amber-100 text-amber-800',
  triggered: 'bg-blue-100 text-blue-800',
};

const availableJobs = [
  { id: 'map-sync', name: 'HUBZone Map Data Sync', description: 'Sync latest HUBZone boundary data from SBA' },
  { id: 'compliance-calc', name: 'Compliance Score Recalculation', description: 'Recalculate all business compliance scores' },
  { id: 'cert-check', name: 'Certification Expiration Check', description: 'Check for expiring certifications' },
  { id: 'email-batch', name: 'Email Notification Batch', description: 'Send pending email notifications' },
  { id: 'audit-cleanup', name: 'Audit Log Cleanup', description: 'Clean up old audit log entries' },
  { id: 'db-backup', name: 'Database Backup', description: 'Create a full database backup' },
  { id: 'ocr-process', name: 'Document OCR Processing', description: 'Process queued documents with OCR' },
];

export default function SystemJobs() {
  const [jobs, setJobs] = useState<SystemJob[]>(mockJobs);
  const [filter, setFilter] = useState<JobStatus | 'all'>('all');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedJobType, setSelectedJobType] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [showJobDetails, setShowJobDetails] = useState<SystemJob | null>(null);

  const filteredJobs = filter === 'all' ? jobs : jobs.filter((job) => job.status === filter);

  const queueStats = {
    pending: jobs.filter((j) => j.status === 'pending').length,
    running: jobs.filter((j) => j.status === 'running').length,
    completed: jobs.filter((j) => j.status === 'completed').length,
    failed: jobs.filter((j) => j.status === 'failed').length,
  };

  const handleRetryJob = (jobId: string) => {
    if (!confirm('Retry this job?')) return;
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? { ...job, status: 'pending' as JobStatus, progress: 0, result: undefined }
          : job
      )
    );
  };

  const handleCancelJob = (jobId: string) => {
    if (!confirm('Cancel this job?')) return;
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? { ...job, status: 'cancelled' as JobStatus }
          : job
      )
    );
  };

  const handleScheduleJob = () => {
    if (!selectedJobType || !scheduledTime) return;
    const jobInfo = availableJobs.find((j) => j.id === selectedJobType);
    if (!jobInfo) return;

    const newJob: SystemJob = {
      id: `job-${Date.now()}`,
      name: jobInfo.name,
      type: 'manual',
      status: 'pending',
      progress: 0,
      startedAt: null,
      completedAt: null,
      nextRun: new Date(scheduledTime).toISOString(),
    };

    setJobs((prev) => [newJob, ...prev]);
    setShowScheduleModal(false);
    setSelectedJobType('');
    setScheduledTime('');
  };

  const handleRunNow = (jobType: string) => {
    const jobInfo = availableJobs.find((j) => j.id === jobType);
    if (!jobInfo) return;

    const newJob: SystemJob = {
      id: `job-${Date.now()}`,
      name: jobInfo.name,
      type: 'manual',
      status: 'running',
      progress: 0,
      startedAt: new Date().toISOString(),
      completedAt: null,
      nextRun: null,
    };

    setJobs((prev) => [newJob, ...prev]);
  };

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return 'In progress...';
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const duration = endTime - startTime;
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">System Jobs</h1>
          <p className="text-gray-500 mt-1">Manage background jobs and scheduled tasks</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowScheduleModal(true)}
            className="px-4 py-2 bg-hubzone-600 text-white text-sm font-medium rounded-lg hover:bg-hubzone-700"
          >
            Schedule Job
          </button>
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </Link>
        </div>
      </div>

      {/* Queue Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{queueStats.pending}</p>
              <p className="text-sm text-gray-500">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{queueStats.running}</p>
              <p className="text-sm text-gray-500">Running</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{queueStats.completed}</p>
              <p className="text-sm text-gray-500">Completed</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{queueStats.failed}</p>
              <p className="text-sm text-gray-500">Failed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {availableJobs.slice(0, 4).map((job) => (
            <button
              key={job.id}
              onClick={() => handleRunNow(job.id)}
              className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
            >
              <div className="w-8 h-8 bg-hubzone-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-hubzone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{job.name}</p>
                <p className="text-xs text-gray-500">Run now</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Jobs Filter & List */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Job Queue</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-sm rounded-lg ${filter === 'all' ? 'bg-hubzone-100 text-hubzone-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('running')}
              className={`px-3 py-1 text-sm rounded-lg ${filter === 'running' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Running
            </button>
            <button
              onClick={() => setFilter('failed')}
              className={`px-3 py-1 text-sm rounded-lg ${filter === 'failed' ? 'bg-red-100 text-red-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Failed
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {filteredJobs.map((job) => (
            <div key={job.id} className="px-5 py-4 hover:bg-gray-50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900">{job.name}</h4>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${jobTypeColors[job.type]}`}>
                      {job.type}
                    </span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${jobStatusColors[job.status]}`}>
                      {job.status}
                    </span>
                  </div>
                  {job.status === 'running' && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-xs">
                        <div
                          className="h-2 bg-blue-600 rounded-full transition-all"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">{job.progress}%</span>
                    </div>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    {job.startedAt && (
                      <span>Started: {new Date(job.startedAt).toLocaleString()}</span>
                    )}
                    {job.completedAt && (
                      <span>Duration: {formatDuration(job.startedAt!, job.completedAt)}</span>
                    )}
                    {job.nextRun && (
                      <span>Next run: {new Date(job.nextRun).toLocaleString()}</span>
                    )}
                  </div>
                  {job.result && (
                    <div className={`mt-2 text-sm ${job.result.success ? 'text-green-600' : 'text-red-600'}`}>
                      {job.result.message}
                      {job.result.recordsProcessed !== undefined && ` (${job.result.recordsProcessed} records)`}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowJobDetails(job)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                    title="View details"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  {job.status === 'failed' && (
                    <button
                      onClick={() => handleRetryJob(job.id)}
                      className="p-2 text-amber-500 hover:text-amber-600"
                      title="Retry"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  )}
                  {(job.status === 'pending' || job.status === 'running') && (
                    <button
                      onClick={() => handleCancelJob(job.id)}
                      className="p-2 text-red-500 hover:text-red-600"
                      title="Cancel"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Schedule Job Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowScheduleModal(false)} />
            <div className="relative inline-block w-full max-w-lg p-6 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Schedule Job</h3>
                <button onClick={() => setShowScheduleModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Type</label>
                  <select
                    value={selectedJobType}
                    onChange={(e) => setSelectedJobType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                  >
                    <option value="">Select a job...</option>
                    {availableJobs.map((job) => (
                      <option key={job.id} value={job.id}>{job.name}</option>
                    ))}
                  </select>
                  {selectedJobType && (
                    <p className="text-sm text-gray-500 mt-1">
                      {availableJobs.find((j) => j.id === selectedJobType)?.description}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Time</label>
                  <input
                    type="datetime-local"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setShowScheduleModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                  Cancel
                </button>
                <button
                  onClick={handleScheduleJob}
                  disabled={!selectedJobType || !scheduledTime}
                  className="px-4 py-2 text-sm bg-hubzone-600 text-white rounded-lg hover:bg-hubzone-700 disabled:opacity-50"
                >
                  Schedule Job
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Job Details Modal */}
      {showJobDetails && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowJobDetails(null)} />
            <div className="relative inline-block w-full max-w-lg p-6 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Job Details</h3>
                <button onClick={() => setShowJobDetails(null)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium text-gray-900">{showJobDetails.name}</h4>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${jobStatusColors[showJobDetails.status]}`}>
                      {showJobDetails.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">ID: {showJobDetails.id}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Type</p>
                    <p className="font-medium text-gray-900">{showJobDetails.type}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Progress</p>
                    <p className="font-medium text-gray-900">{showJobDetails.progress}%</p>
                  </div>
                  {showJobDetails.startedAt && (
                    <div>
                      <p className="text-gray-500">Started</p>
                      <p className="font-medium text-gray-900">{new Date(showJobDetails.startedAt).toLocaleString()}</p>
                    </div>
                  )}
                  {showJobDetails.completedAt && (
                    <div>
                      <p className="text-gray-500">Completed</p>
                      <p className="font-medium text-gray-900">{new Date(showJobDetails.completedAt).toLocaleString()}</p>
                    </div>
                  )}
                  {showJobDetails.cronExpression && (
                    <div>
                      <p className="text-gray-500">Schedule</p>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">{showJobDetails.cronExpression}</code>
                    </div>
                  )}
                  {showJobDetails.nextRun && (
                    <div>
                      <p className="text-gray-500">Next Run</p>
                      <p className="font-medium text-gray-900">{new Date(showJobDetails.nextRun).toLocaleString()}</p>
                    </div>
                  )}
                </div>

                {showJobDetails.result && (
                  <div className={`p-3 rounded-lg ${showJobDetails.result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <p className={`text-sm font-medium ${showJobDetails.result.success ? 'text-green-800' : 'text-red-800'}`}>
                      {showJobDetails.result.success ? 'Success' : 'Failed'}
                    </p>
                    {showJobDetails.result.message && (
                      <p className={`text-sm mt-1 ${showJobDetails.result.success ? 'text-green-700' : 'text-red-700'}`}>
                        {showJobDetails.result.message}
                      </p>
                    )}
                    {showJobDetails.result.recordsProcessed !== undefined && (
                      <p className="text-sm text-gray-600 mt-1">
                        Records processed: {showJobDetails.result.recordsProcessed}
                        {showJobDetails.result.errors !== undefined && showJobDetails.result.errors > 0 && (
                          <span className="text-red-600"> ({showJobDetails.result.errors} errors)</span>
                        )}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowJobDetails(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

