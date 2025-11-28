import { useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Extended application form schema with additional fields
const applicationFormSchema = z.object({
  coverLetter: z.string().max(5000, 'Cover letter too long').optional(),
  resumeUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  portfolioUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  phone: z.string().optional(),
  salaryExpectation: z.object({
    min: z.number().min(0).optional(),
    max: z.number().min(0).optional(),
    type: z.enum(['hourly', 'annual']).default('annual'),
  }).optional(),
  availableStartDate: z.string().optional(),
  additionalInfo: z.string().max(2000).optional(),
});

type ApplicationFormData = z.infer<typeof applicationFormSchema>;

interface ApplicationFormProps {
  jobTitle: string;
  companyName: string;
  hubzoneRequired?: boolean;
  isHubzoneVerified?: boolean;
  existingResumeUrl?: string;
  onSubmit: (data: ApplicationFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function ApplicationForm({
  jobTitle,
  companyName,
  hubzoneRequired = false,
  isHubzoneVerified = false,
  existingResumeUrl,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ApplicationFormProps) {
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [uploadedResumeUrl, setUploadedResumeUrl] = useState<string | null>(existingResumeUrl || null);
  const [showSalaryField, setShowSalaryField] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues: {
      coverLetter: '',
      resumeUrl: existingResumeUrl || '',
      portfolioUrl: '',
      phone: '',
      salaryExpectation: {
        min: undefined,
        max: undefined,
        type: 'annual',
      },
      availableStartDate: '',
      additionalInfo: '',
    },
  });

  const watchedSalaryType = watch('salaryExpectation.type');

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a PDF or Word document');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setIsUploadingResume(true);
    try {
      // In a real app, upload to your server/cloud storage
      // For now, create a local URL
      const formData = new FormData();
      formData.append('resume', file);

      // Mock upload - replace with actual upload logic
      const response = await fetch('/api/upload/resume', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setUploadedResumeUrl(data.url);
        setValue('resumeUrl', data.url);
      } else {
        // Fallback: create object URL for demo
        const objectUrl = URL.createObjectURL(file);
        setUploadedResumeUrl(objectUrl);
        setValue('resumeUrl', objectUrl);
      }
    } catch (error) {
      // Fallback for demo
      const objectUrl = URL.createObjectURL(file);
      setUploadedResumeUrl(objectUrl);
      setValue('resumeUrl', objectUrl);
    } finally {
      setIsUploadingResume(false);
    }
  };

  const handleFormSubmit = async (data: ApplicationFormData) => {
    // Use uploaded resume URL if available
    if (uploadedResumeUrl) {
      data.resumeUrl = uploadedResumeUrl;
    }
    await onSubmit(data);
  };

  const formatSalaryPlaceholder = (type: string) => {
    return type === 'hourly' ? '$25/hr' : '$75,000';
  };

  // Calculate min date for available start date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Header */}
      <div className="text-center pb-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">Apply for {jobTitle}</h2>
        <p className="text-gray-500">at {companyName}</p>
      </div>

      {/* HUBZone Warning */}
      {hubzoneRequired && !isHubzoneVerified && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800">HUBZone Residency Required</p>
              <p className="text-sm text-amber-700 mt-1">
                This position requires verified HUBZone residency. Your application may be prioritized 
                lower without verification. <a href="/profile" className="underline hover:no-underline">Verify your residency</a>
              </p>
            </div>
          </div>
        </div>
      )}

      {hubzoneRequired && isHubzoneVerified && (
        <div className="p-4 bg-verified-50 border border-verified-200 rounded-xl">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-verified-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-verified-800">HUBZone Residency Verified</p>
              <p className="text-sm text-verified-700 mt-1">
                Your verified HUBZone status will be shared with the employer.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cover Letter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Cover Letter
        </label>
        <textarea
          {...register('coverLetter')}
          rows={6}
          placeholder="Tell the employer why you're a great fit for this role. Highlight your relevant experience and what excites you about this opportunity..."
          className={`w-full px-4 py-3 rounded-xl border ${
            errors.coverLetter ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-hubzone-500'
          } focus:border-transparent focus:outline-none focus:ring-2 resize-none`}
        />
        {errors.coverLetter && (
          <p className="mt-1 text-sm text-red-600">{errors.coverLetter.message}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          A strong cover letter can significantly improve your chances
        </p>
      </div>

      {/* Resume Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Resume
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleResumeUpload}
          className="hidden"
        />

        {uploadedResumeUrl ? (
          <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Resume attached</p>
                <p className="text-sm text-gray-500">
                  {existingResumeUrl ? 'Using profile resume' : 'Newly uploaded'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingResume}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Replace
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingResume}
            className="w-full py-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 transition-colors flex flex-col items-center justify-center gap-2"
          >
            {isUploadingResume ? (
              <>
                <svg className="w-8 h-8 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-gray-500">Uploading...</span>
              </>
            ) : (
              <>
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="text-gray-600 font-medium">Upload your resume</span>
                <span className="text-xs text-gray-400">PDF or Word document, max 5MB</span>
              </>
            )}
          </button>
        )}

        {/* Or paste URL */}
        <div className="mt-3">
          <label className="text-sm text-gray-500">Or paste a link to your resume:</label>
          <input
            {...register('resumeUrl')}
            type="url"
            placeholder="https://drive.google.com/..."
            className="mt-1 w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500 text-sm"
          />
          {errors.resumeUrl && (
            <p className="mt-1 text-sm text-red-600">{errors.resumeUrl.message}</p>
          )}
        </div>
      </div>

      {/* Portfolio URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Portfolio / Work Samples <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          {...register('portfolioUrl')}
          type="url"
          placeholder="https://..."
          className={`w-full px-4 py-3 rounded-xl border ${
            errors.portfolioUrl ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-hubzone-500'
          } focus:border-transparent focus:outline-none focus:ring-2`}
        />
        {errors.portfolioUrl && (
          <p className="mt-1 text-sm text-red-600">{errors.portfolioUrl.message}</p>
        )}
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Phone Number <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          {...register('phone')}
          type="tel"
          placeholder="(555) 555-5555"
          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          Providing a phone number may help employers contact you faster
        </p>
      </div>

      {/* Salary Expectations */}
      <div>
        <button
          type="button"
          onClick={() => setShowSalaryField(!showSalaryField)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showSalaryField ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Add Salary Expectations (optional)
        </button>

        {showSalaryField && (
          <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                <Controller
                  name="salaryExpectation.type"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                    >
                      <option value="annual">Annual</option>
                      <option value="hourly">Hourly</option>
                    </select>
                  )}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Minimum</label>
                <Controller
                  name="salaryExpectation.min"
                  control={control}
                  render={({ field: { onChange, value, ...field } }) => (
                    <input
                      {...field}
                      type="number"
                      value={value ?? ''}
                      onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder={formatSalaryPlaceholder(watchedSalaryType || 'annual')}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                    />
                  )}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Maximum</label>
                <Controller
                  name="salaryExpectation.max"
                  control={control}
                  render={({ field: { onChange, value, ...field } }) => (
                    <input
                      {...field}
                      type="number"
                      value={value ?? ''}
                      onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder={formatSalaryPlaceholder(watchedSalaryType || 'annual')}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                    />
                  )}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Available Start Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Available Start Date <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          {...register('availableStartDate')}
          type="date"
          min={today}
          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500"
        />
      </div>

      {/* Additional Information */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Additional Information <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          {...register('additionalInfo')}
          rows={3}
          placeholder="Any other information you'd like to share with the employer..."
          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500 resize-none"
        />
      </div>

      {/* Privacy Notice */}
      <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-600">
        <p className="flex items-start gap-2">
          <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          By submitting this application, you agree to share your profile information with the employer. 
          Your contact details will only be shared if the employer reviews your application.
        </p>
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || isUploadingResume}
          className="flex-1 py-3 bg-hubzone-600 text-white font-medium rounded-xl hover:bg-hubzone-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Submitting...
            </>
          ) : (
            'Submit Application'
          )}
        </button>
      </div>
    </form>
  );
}

export { ApplicationForm };

