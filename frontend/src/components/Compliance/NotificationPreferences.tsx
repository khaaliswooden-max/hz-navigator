import { useState } from 'react';
import { clsx } from 'clsx';

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  email: boolean;
  sms: boolean;
  inApp: boolean;
}

interface FrequencySetting {
  id: string;
  label: string;
  value: 'immediate' | 'hourly' | 'daily' | 'weekly';
}

const defaultSettings: NotificationSetting[] = [
  {
    id: 'critical_alerts',
    label: 'Critical Alerts',
    description: 'Urgent compliance issues requiring immediate attention',
    email: true,
    sms: true,
    inApp: true,
  },
  {
    id: 'high_priority',
    label: 'High Priority Alerts',
    description: 'Important compliance matters that need attention soon',
    email: true,
    sms: false,
    inApp: true,
  },
  {
    id: 'medium_priority',
    label: 'Medium Priority Alerts',
    description: 'Compliance matters to address within a reasonable timeframe',
    email: true,
    sms: false,
    inApp: true,
  },
  {
    id: 'low_priority',
    label: 'Low Priority Alerts',
    description: 'Informational alerts and reminders',
    email: false,
    sms: false,
    inApp: true,
  },
  {
    id: 'certification_updates',
    label: 'Certification Updates',
    description: 'Notifications about certification status and renewals',
    email: true,
    sms: true,
    inApp: true,
  },
  {
    id: 'employee_changes',
    label: 'Employee Changes',
    description: 'Updates when employee information affects compliance',
    email: true,
    sms: false,
    inApp: true,
  },
  {
    id: 'report_summaries',
    label: 'Weekly Report Summaries',
    description: 'Weekly digest of compliance status and activities',
    email: true,
    sms: false,
    inApp: false,
  },
];

const defaultFrequency: FrequencySetting[] = [
  { id: 'critical', label: 'Critical Alerts', value: 'immediate' },
  { id: 'digest', label: 'Non-Critical Digest', value: 'daily' },
  { id: 'reports', label: 'Report Summaries', value: 'weekly' },
];

interface NotificationPreferencesProps {
  onSave?: (settings: NotificationSetting[], frequency: FrequencySetting[]) => void;
  className?: string;
}

export default function NotificationPreferences({ 
  onSave,
  className 
}: NotificationPreferencesProps) {
  const [settings, setSettings] = useState<NotificationSetting[]>(defaultSettings);
  const [frequency, setFrequency] = useState<FrequencySetting[]>(defaultFrequency);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleToggle = (
    settingId: string, 
    channel: 'email' | 'sms' | 'inApp'
  ) => {
    setSettings(prev => prev.map(s => 
      s.id === settingId 
        ? { ...s, [channel]: !s[channel] }
        : s
    ));
  };

  const handleFrequencyChange = (settingId: string, value: FrequencySetting['value']) => {
    setFrequency(prev => prev.map(f =>
      f.id === settingId
        ? { ...f, value }
        : f
    ));
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    onSave?.(settings, frequency);
    setIsSaving(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleEnableAll = (channel: 'email' | 'sms' | 'inApp') => {
    setSettings(prev => prev.map(s => ({ ...s, [channel]: true })));
  };

  const handleDisableAll = (channel: 'email' | 'sms' | 'inApp') => {
    setSettings(prev => prev.map(s => ({ ...s, [channel]: false })));
  };

  return (
    <div className={clsx('space-y-8', className)}>
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
        <p className="text-sm text-gray-500 mt-1">
          Configure how and when you receive compliance alerts
        </p>
      </div>

      {/* Global Channel Toggles */}
      <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Notification Channels</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Email Toggle */}
          <div className="flex items-center justify-between bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Email Notifications</p>
                <p className="text-xs text-gray-500">Receive alerts via email</p>
              </div>
            </div>
            <button
              onClick={() => setEmailEnabled(!emailEnabled)}
              className={clsx(
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-hubzone-500 focus:ring-offset-2',
                emailEnabled ? 'bg-hubzone-500' : 'bg-gray-200'
              )}
            >
              <span
                className={clsx(
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  emailEnabled ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>

          {/* SMS Toggle */}
          <div className="flex items-center justify-between bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">SMS Notifications</p>
                <p className="text-xs text-gray-500">Receive urgent alerts via text</p>
              </div>
            </div>
            <button
              onClick={() => setSmsEnabled(!smsEnabled)}
              className={clsx(
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-hubzone-500 focus:ring-offset-2',
                smsEnabled ? 'bg-hubzone-500' : 'bg-gray-200'
              )}
            >
              <span
                className={clsx(
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  smsEnabled ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Alert Type Settings */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">Alert Type Preferences</h3>
          <p className="text-xs text-gray-500 mt-1">Choose which channels to use for each alert type</p>
        </div>
        
        {/* Header row */}
        <div className="hidden sm:grid grid-cols-[1fr,80px,80px,80px] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500">
          <div>Alert Type</div>
          <div className="text-center">Email</div>
          <div className="text-center">SMS</div>
          <div className="text-center">In-App</div>
        </div>

        {/* Settings rows */}
        <div className="divide-y divide-gray-100">
          {settings.map((setting) => (
            <div 
              key={setting.id}
              className="grid grid-cols-1 sm:grid-cols-[1fr,80px,80px,80px] gap-4 px-5 py-4 items-center"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{setting.label}</p>
                <p className="text-xs text-gray-500">{setting.description}</p>
              </div>
              
              {/* Mobile labels + Desktop checkboxes */}
              <div className="flex items-center justify-between sm:justify-center gap-2">
                <span className="text-xs text-gray-500 sm:hidden">Email</span>
                <input
                  type="checkbox"
                  checked={setting.email && emailEnabled}
                  disabled={!emailEnabled}
                  onChange={() => handleToggle(setting.id, 'email')}
                  className={clsx(
                    'w-5 h-5 text-hubzone-600 border-gray-300 rounded focus:ring-hubzone-500',
                    !emailEnabled && 'opacity-50 cursor-not-allowed'
                  )}
                />
              </div>
              
              <div className="flex items-center justify-between sm:justify-center gap-2">
                <span className="text-xs text-gray-500 sm:hidden">SMS</span>
                <input
                  type="checkbox"
                  checked={setting.sms && smsEnabled}
                  disabled={!smsEnabled}
                  onChange={() => handleToggle(setting.id, 'sms')}
                  className={clsx(
                    'w-5 h-5 text-hubzone-600 border-gray-300 rounded focus:ring-hubzone-500',
                    !smsEnabled && 'opacity-50 cursor-not-allowed'
                  )}
                />
              </div>
              
              <div className="flex items-center justify-between sm:justify-center gap-2">
                <span className="text-xs text-gray-500 sm:hidden">In-App</span>
                <input
                  type="checkbox"
                  checked={setting.inApp}
                  onChange={() => handleToggle(setting.id, 'inApp')}
                  className="w-5 h-5 text-hubzone-600 border-gray-300 rounded focus:ring-hubzone-500"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="text-gray-500">Quick actions:</span>
            <button
              onClick={() => handleEnableAll('email')}
              className="text-hubzone-600 hover:text-hubzone-700"
            >
              Enable all email
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={() => handleDisableAll('email')}
              className="text-gray-500 hover:text-gray-700"
            >
              Disable all email
            </button>
          </div>
        </div>
      </div>

      {/* Frequency Settings */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">Notification Frequency</h3>
          <p className="text-xs text-gray-500 mt-1">Control how often you receive notifications</p>
        </div>
        
        <div className="divide-y divide-gray-100">
          {frequency.map((freq) => (
            <div 
              key={freq.id}
              className="flex items-center justify-between px-5 py-4"
            >
              <p className="text-sm font-medium text-gray-900">{freq.label}</p>
              <select
                value={freq.value}
                onChange={(e) => handleFrequencyChange(freq.id, e.target.value as FrequencySetting['value'])}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-hubzone-500"
              >
                <option value="immediate">Immediately</option>
                <option value="hourly">Hourly digest</option>
                <option value="daily">Daily digest</option>
                <option value="weekly">Weekly digest</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div>
          {showSuccess && (
            <span className="text-sm text-emerald-600 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Preferences saved successfully
            </span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={clsx(
            'px-6 py-2.5 rounded-lg text-sm font-medium transition-colors',
            'bg-hubzone-600 text-white hover:bg-hubzone-700',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving...
            </span>
          ) : (
            'Save Preferences'
          )}
        </button>
      </div>
    </div>
  );
}

export { NotificationPreferences };

