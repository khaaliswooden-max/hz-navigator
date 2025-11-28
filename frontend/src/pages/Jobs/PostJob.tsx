import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  jobFormSchema,
  type JobFormData,
  type RequiredSkill,
  EMPLOYMENT_TYPE_OPTIONS,
  REMOTE_POLICY_OPTIONS,
} from '../../types/job';
import { AVAILABLE_SKILLS } from '../../types/professional';
import jobService from '../../services/jobService';

const usStates = [
  { value: 'AL', label: 'Alabama' }, { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' }, { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' }, { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' }, { value: 'DE', label: 'Delaware' },
  { value: 'DC', label: 'District of Columbia' }, { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' }, { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' }, { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' }, { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' }, { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' }, { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' }, { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' }, { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' }, { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' }, { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' }, { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' }, { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' }, { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' }, { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' }, { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' }, { value: 'PR', label: 'Puerto Rico' },
  { value: 'RI', label: 'Rhode Island' }, { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' }, { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' }, { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' }, { value: 'VA', label: 'Virginia' },
  { value: 'VI', label: 'Virgin Islands' }, { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' }, { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
];

type ToastType = 'success' | 'error';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

export default function PostJob() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [skillSearch, setSkillSearch] = useState('');
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Toast helper
  const showToast = useCallback((type: ToastType, message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const defaultValues: JobFormData = {
    title: '',
    description: '',
    responsibilities: '',
    qualifications: '',
    benefits: '',
    hubzoneResidentRequired: false,
    skills: [],
    experienceYears: undefined,
    educationRequired: '',
    salaryRange: {
      min: 50000,
      max: 80000,
      type: 'annual',
      currency: 'USD',
    },
    employmentType: 'full_time',
    location: {
      street1: '',
      street2: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US',
    },
    isRemote: false,
    remotePolicy: 'on_site',
    expiresAt: '',
  };

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
    setValue,
  } = useForm<JobFormData>({
    resolver: zodResolver(jobFormSchema),
    defaultValues,
    mode: 'onChange',
  });

  const { fields: skillFields, append: appendSkill, remove: removeSkill } = useFieldArray({
    control,
    name: 'skills',
  });

  const watchedValues = watch();
  const watchedSkills = watch('skills');
  const watchedIsRemote = watch('isRemote');

  // Filter available skills
  const filteredSkills = AVAILABLE_SKILLS.filter((skill) => {
    const matchesSearch = skill.name.toLowerCase().includes(skillSearch.toLowerCase());
    const notSelected = !watchedSkills?.some((s) => s.id === skill.id);
    return matchesSearch && notSelected;
  });

  const handleAddSkill = (skill: { id: string; name: string }, required = true) => {
    const newSkill: RequiredSkill = {
      id: skill.id,
      name: skill.name,
      required,
    };
    appendSkill(newSkill);
    setSkillSearch('');
    setShowSkillDropdown(false);
  };

  const toggleSkillRequired = (index: number) => {
    const currentSkill = skillFields[index];
    setValue(`skills.${index}.required`, !currentSkill.required);
  };

  const handleSaveDraft = async (data: JobFormData) => {
    setIsSubmitting(true);
    try {
      const response = await jobService.createJob(data);
      if (response.success) {
        showToast('success', 'Job saved as draft');
        navigate('/jobs/manage');
      } else {
        showToast('error', response.error?.message || 'Failed to save draft');
      }
    } catch (err) {
      showToast('error', 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async (data: JobFormData) => {
    setIsSubmitting(true);
    try {
      const createResponse = await jobService.createJob(data);
      if (createResponse.success && createResponse.data) {
        const publishResponse = await jobService.publishJob(createResponse.data.id);
        if (publishResponse.success) {
          showToast('success', 'Job posted successfully!');
          navigate(`/jobs/${createResponse.data.id}`);
        } else {
          showToast('error', publishResponse.error?.message || 'Failed to publish job');
        }
      } else {
        showToast('error', createResponse.error?.message || 'Failed to create job');
      }
    } catch (err) {
      showToast('error', 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatSalary = (min: number, max: number, type: 'hourly' | 'annual'): string => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    });
    return type === 'hourly'
      ? `${formatter.format(min)} - ${formatter.format(max)}/hr`
      : `${formatter.format(min)} - ${formatter.format(max)}/yr`;
  };

  return (
    <div className="space-y-6">
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg ${
              toast.type === 'success'
                ? 'bg-verified-50 border border-verified-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            {toast.type === 'success' ? (
              <svg className="w-5 h-5 text-verified-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className={`text-sm font-medium ${toast.type === 'success' ? 'text-verified-800' : 'text-red-800'}`}>
              {toast.message}
            </span>
            <button onClick={() => removeToast(toast.id)} className={toast.type === 'success' ? 'text-verified-600' : 'text-red-600'}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link to="/jobs" className="hover:text-gray-700">Jobs</Link>
            <span>/</span>
            <span className="text-gray-700">Post New Job</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-gray-900">
            Post a New Job
          </h1>
          <p className="text-gray-500 mt-1">Create a job posting to find qualified HUBZone professionals</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            {showPreview ? 'Edit' : 'Preview'}
          </button>
        </div>
      </div>

      {showPreview ? (
        /* Preview Mode */
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-hubzone-50 to-verified-50">
            <h2 className="text-lg font-semibold text-gray-900">Job Preview</h2>
            <p className="text-sm text-gray-600">This is how your job posting will appear to candidates</p>
          </div>
          <div className="p-6">
            {/* Preview Header */}
            <div className="mb-6">
              <div className="flex items-start gap-2 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{watchedValues.title || 'Job Title'}</h1>
                {watchedValues.hubzoneResidentRequired && (
                  <span className="px-2.5 py-1 bg-hubzone-100 text-hubzone-700 text-sm font-medium rounded-lg">
                    HUBZone Required
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  {watchedValues.location.city || 'City'}, {watchedValues.location.state || 'State'}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatSalary(watchedValues.salaryRange.min, watchedValues.salaryRange.max, watchedValues.salaryRange.type)}
                </span>
                <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-700">
                  {EMPLOYMENT_TYPE_OPTIONS.find(e => e.value === watchedValues.employmentType)?.label}
                </span>
                {watchedValues.isRemote && (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded">
                    {REMOTE_POLICY_OPTIONS.find(r => r.value === watchedValues.remotePolicy)?.label}
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Job Description</h3>
              <div className="text-gray-700 whitespace-pre-wrap">
                {watchedValues.description || 'No description provided'}
              </div>
            </div>

            {/* Responsibilities */}
            {watchedValues.responsibilities && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Responsibilities</h3>
                <div className="text-gray-700 whitespace-pre-wrap">{watchedValues.responsibilities}</div>
              </div>
            )}

            {/* Qualifications */}
            {watchedValues.qualifications && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Qualifications</h3>
                <div className="text-gray-700 whitespace-pre-wrap">{watchedValues.qualifications}</div>
              </div>
            )}

            {/* Skills */}
            {watchedValues.skills.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {watchedValues.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className={`px-3 py-1 rounded-lg text-sm font-medium ${
                        skill.required
                          ? 'bg-violet-100 text-violet-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {skill.name}
                      {!skill.required && <span className="ml-1 text-xs">(preferred)</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Benefits */}
            {watchedValues.benefits && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Benefits</h3>
                <div className="text-gray-700 whitespace-pre-wrap">{watchedValues.benefits}</div>
              </div>
            )}
          </div>
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
            <button
              onClick={() => setShowPreview(false)}
              className="px-4 py-2 text-gray-700 font-medium rounded-lg hover:bg-gray-100"
            >
              Continue Editing
            </button>
            <button
              onClick={handleSubmit(handlePublish)}
              disabled={isSubmitting}
              className="px-6 py-2 bg-hubzone-600 text-white font-medium rounded-lg hover:bg-hubzone-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Publishing...' : 'Publish Job'}
            </button>
          </div>
        </div>
      ) : (
        /* Edit Mode */
        <form className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-hubzone-500 to-hubzone-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Job Details</h3>
                <p className="text-sm text-gray-500">Basic information about the position</p>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Job Title <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('title')}
                  type="text"
                  id="title"
                  placeholder="e.g., Senior Project Manager"
                  className={`w-full px-4 py-3 rounded-xl border ${
                    errors.title ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-hubzone-500'
                  } focus:border-transparent focus:outline-none focus:ring-2`}
                />
                {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
              </div>

              {/* Employment Type & Remote */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="employmentType" className="block text-sm font-medium text-gray-700 mb-1">
                    Employment Type <span className="text-red-500">*</span>
                  </label>
                  <Controller
                    name="employmentType"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        id="employmentType"
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500 bg-white"
                      >
                        {EMPLOYMENT_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    )}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remote Work</label>
                  <Controller
                    name="isRemote"
                    control={control}
                    render={({ field }) => (
                      <button
                        type="button"
                        onClick={() => field.onChange(!field.value)}
                        className={`w-full px-4 py-3 rounded-xl border text-left flex items-center justify-between ${
                          field.value ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300'
                        }`}
                      >
                        <span className={field.value ? 'text-emerald-700' : 'text-gray-500'}>
                          {field.value ? 'Yes, remote available' : 'No, on-site only'}
                        </span>
                        <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          field.value ? 'bg-emerald-600' : 'bg-gray-300'
                        }`}>
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            field.value ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </div>
                      </button>
                    )}
                  />
                </div>
                {watchedIsRemote && (
                  <div>
                    <label htmlFor="remotePolicy" className="block text-sm font-medium text-gray-700 mb-1">
                      Remote Policy
                    </label>
                    <Controller
                      name="remotePolicy"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          id="remotePolicy"
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500 bg-white"
                        >
                          {REMOTE_POLICY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      )}
                    />
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Job Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  {...register('description')}
                  id="description"
                  rows={6}
                  placeholder="Describe the role, team, and what makes this opportunity exciting..."
                  className={`w-full px-4 py-3 rounded-xl border ${
                    errors.description ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-hubzone-500'
                  } focus:border-transparent focus:outline-none focus:ring-2 resize-none`}
                />
                {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
              </div>

              {/* Responsibilities */}
              <div>
                <label htmlFor="responsibilities" className="block text-sm font-medium text-gray-700 mb-1">
                  Responsibilities
                </label>
                <textarea
                  {...register('responsibilities')}
                  id="responsibilities"
                  rows={4}
                  placeholder="• Lead project planning and execution&#10;• Manage team of 5 engineers&#10;• Report to stakeholders..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500 resize-none"
                />
              </div>

              {/* Qualifications */}
              <div>
                <label htmlFor="qualifications" className="block text-sm font-medium text-gray-700 mb-1">
                  Qualifications
                </label>
                <textarea
                  {...register('qualifications')}
                  id="qualifications"
                  rows={4}
                  placeholder="• 5+ years of project management experience&#10;• PMP certification preferred&#10;• Strong communication skills..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500 resize-none"
                />
              </div>

              {/* Benefits */}
              <div>
                <label htmlFor="benefits" className="block text-sm font-medium text-gray-700 mb-1">
                  Benefits
                </label>
                <textarea
                  {...register('benefits')}
                  id="benefits"
                  rows={3}
                  placeholder="• Competitive salary&#10;• Health insurance&#10;• 401(k) matching&#10;• Flexible PTO..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* HUBZone Requirement */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-hubzone-50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-hubzone-500 to-hubzone-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">HUBZone Requirement</h3>
                <p className="text-sm text-gray-500">Specify if HUBZone residency is required</p>
              </div>
            </div>
            <div className="p-6">
              <Controller
                name="hubzoneResidentRequired"
                control={control}
                render={({ field }) => (
                  <label className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    field.value ? 'border-hubzone-500 bg-hubzone-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="w-5 h-5 rounded border-gray-300 text-hubzone-600 focus:ring-hubzone-500 mt-0.5"
                    />
                    <div>
                      <span className="font-medium text-gray-900">Require HUBZone Residency</span>
                      <p className="text-sm text-gray-500 mt-1">
                        Only candidates who are verified HUBZone residents will be able to apply. 
                        This helps maintain your HUBZone certification compliance by ensuring 35% of employees are HUBZone residents.
                      </p>
                    </div>
                  </label>
                )}
              />
            </div>
          </div>

          {/* Skills */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Required Skills</h3>
                <p className="text-sm text-gray-500">Add skills needed for this position</p>
              </div>
            </div>
            <div className="p-6">
              {/* Skill Search */}
              <div className="relative mb-4">
                <input
                  type="text"
                  value={skillSearch}
                  onChange={(e) => setSkillSearch(e.target.value)}
                  onFocus={() => setShowSkillDropdown(true)}
                  onBlur={() => setTimeout(() => setShowSkillDropdown(false), 200)}
                  placeholder="Search skills to add..."
                  className="w-full px-4 py-3 pl-10 rounded-xl border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>

                {showSkillDropdown && filteredSkills.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white rounded-xl border border-gray-200 shadow-lg max-h-60 overflow-auto">
                    {filteredSkills.slice(0, 15).map((skill) => (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => handleAddSkill(skill)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-center justify-between"
                      >
                        <span className="text-sm text-gray-900">{skill.name}</span>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{skill.category}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {errors.skills && <p className="mb-2 text-sm text-red-600">{errors.skills.message}</p>}

              {/* Selected Skills */}
              {skillFields.length > 0 ? (
                <div className="space-y-2">
                  {skillFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-900">{field.name}</span>
                        <button
                          type="button"
                          onClick={() => toggleSkillRequired(index)}
                          className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                            field.required
                              ? 'bg-violet-100 text-violet-700'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {field.required ? 'Required' : 'Preferred'}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSkill(index)}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">No skills added yet</p>
                  <p className="text-xs text-gray-400">Search above to add required skills</p>
                </div>
              )}
            </div>
          </div>

          {/* Compensation */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Compensation</h3>
                <p className="text-sm text-gray-500">Salary range for this position</p>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salary Type</label>
                  <Controller
                    name="salaryRange.type"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500 bg-white"
                      >
                        <option value="annual">Annual</option>
                        <option value="hourly">Hourly</option>
                      </select>
                    )}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum</label>
                  <Controller
                    name="salaryRange.min"
                    control={control}
                    render={({ field: { onChange, value, ...field } }) => (
                      <input
                        {...field}
                        type="number"
                        value={value}
                        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                      />
                    )}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maximum</label>
                  <Controller
                    name="salaryRange.max"
                    control={control}
                    render={({ field: { onChange, value, ...field } }) => (
                      <input
                        {...field}
                        type="number"
                        value={value}
                        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                      />
                    )}
                  />
                  {errors.salaryRange?.max && <p className="mt-1 text-sm text-red-600">{errors.salaryRange.max.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Experience (years)</label>
                  <Controller
                    name="experienceYears"
                    control={control}
                    render={({ field: { onChange, value, ...field } }) => (
                      <input
                        {...field}
                        type="number"
                        min={0}
                        max={50}
                        value={value ?? ''}
                        onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        placeholder="0"
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                      />
                    )}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Work Location</h3>
                <p className="text-sm text-gray-500">Where the position is based</p>
              </div>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Street Address <span className="text-red-500">*</span></label>
                <input
                  {...register('location.street1')}
                  type="text"
                  placeholder="123 Main Street"
                  className={`w-full px-4 py-3 rounded-xl border ${
                    errors.location?.street1 ? 'border-red-300' : 'border-gray-300'
                  } focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500`}
                />
                {errors.location?.street1 && <p className="mt-1 text-sm text-red-600">{errors.location.street1.message}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Suite / Floor</label>
                <input
                  {...register('location.street2')}
                  type="text"
                  placeholder="Suite 100"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City <span className="text-red-500">*</span></label>
                <input
                  {...register('location.city')}
                  type="text"
                  placeholder="Washington"
                  className={`w-full px-4 py-3 rounded-xl border ${
                    errors.location?.city ? 'border-red-300' : 'border-gray-300'
                  } focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500`}
                />
                {errors.location?.city && <p className="mt-1 text-sm text-red-600">{errors.location.city.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State <span className="text-red-500">*</span></label>
                <Controller
                  name="location.state"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      className={`w-full px-4 py-3 rounded-xl border ${
                        errors.location?.state ? 'border-red-300' : 'border-gray-300'
                      } focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500 bg-white`}
                    >
                      <option value="">Select state</option>
                      {usStates.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  )}
                />
                {errors.location?.state && <p className="mt-1 text-sm text-red-600">{errors.location.state.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code <span className="text-red-500">*</span></label>
                <input
                  {...register('location.zipCode')}
                  type="text"
                  maxLength={10}
                  placeholder="20001"
                  className={`w-full px-4 py-3 rounded-xl border ${
                    errors.location?.zipCode ? 'border-red-300' : 'border-gray-300'
                  } focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500`}
                />
                {errors.location?.zipCode && <p className="mt-1 text-sm text-red-600">{errors.location.zipCode.message}</p>}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
            <Link
              to="/jobs"
              className="px-6 py-3 text-center text-gray-700 font-medium rounded-xl border border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={handleSubmit(handleSaveDraft)}
              disabled={isSubmitting}
              className="px-6 py-3 text-gray-700 font-medium rounded-xl border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              Save as Draft
            </button>
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="px-6 py-3 bg-hubzone-100 text-hubzone-700 font-medium rounded-xl hover:bg-hubzone-200"
            >
              Preview & Publish
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export { PostJob };

