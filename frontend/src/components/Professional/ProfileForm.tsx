import { useState, useCallback, useEffect, useRef } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  professionalFormSchema,
  type ProfessionalFormData,
  type Skill,
  type Certification,
  AVAILABLE_SKILLS,
  COMMON_CERTIFICATIONS,
} from '../../types/professional';
import professionalService from '../../services/professionalService';

interface ProfileFormProps {
  initialData?: Partial<ProfessionalFormData>;
  onSubmit: (data: ProfessionalFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  resumeUrl?: string;
  onResumeUpload?: (file: File) => Promise<void>;
  onResumeDelete?: () => Promise<void>;
}

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

const skillCategories = [
  { value: 'technical', label: 'Technical' },
  { value: 'management', label: 'Management' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'finance', label: 'Finance' },
  { value: 'administrative', label: 'Administrative' },
  { value: 'construction', label: 'Construction' },
  { value: 'other', label: 'Other' },
];

export default function ProfileForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  resumeUrl,
  onResumeUpload,
  onResumeDelete,
}: ProfileFormProps) {
  const [skillSearch, setSkillSearch] = useState('');
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [showCertForm, setShowCertForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultValues: Partial<ProfessionalFormData> = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    headline: '',
    summary: '',
    linkedinUrl: '',
    currentAddress: {
      street1: '',
      street2: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US',
    },
    skills: [],
    certifications: [],
    isPublic: true,
    ...initialData,
  };

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting, isDirty },
    watch,
    setValue,
  } = useForm<ProfessionalFormData>({
    resolver: zodResolver(professionalFormSchema),
    defaultValues,
    mode: 'onChange',
  });

  const { fields: skillFields, append: appendSkill, remove: removeSkill } = useFieldArray({
    control,
    name: 'skills',
  });

  const { fields: certFields, append: appendCert, remove: removeCert } = useFieldArray({
    control,
    name: 'certifications',
  });

  const watchedSkills = watch('skills');

  // Filter available skills based on search and already selected
  const filteredSkills = AVAILABLE_SKILLS.filter((skill) => {
    const matchesSearch = skill.name.toLowerCase().includes(skillSearch.toLowerCase());
    const matchesCategory = !selectedCategory || skill.category === selectedCategory;
    const notSelected = !watchedSkills?.some((s) => s.id === skill.id);
    return matchesSearch && matchesCategory && notSelected;
  });

  const handleAddSkill = (skill: Skill) => {
    appendSkill(skill);
    setSkillSearch('');
    setShowSkillDropdown(false);
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onResumeUpload) return;

    // Validate file type
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
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
      await onResumeUpload(file);
    } finally {
      setIsUploadingResume(false);
    }
  };

  const handleFormSubmit = async (data: ProfessionalFormData) => {
    await onSubmit(data);
  };

  // New certification form state
  const [newCert, setNewCert] = useState<Partial<Certification>>({
    name: '',
    issuingOrganization: '',
    issueDate: '',
    expirationDate: '',
    credentialId: '',
    credentialUrl: '',
  });

  const handleAddCertification = () => {
    if (!newCert.name || !newCert.issuingOrganization || !newCert.issueDate) return;
    
    appendCert({
      id: Date.now().toString(),
      name: newCert.name,
      issuingOrganization: newCert.issuingOrganization,
      issueDate: newCert.issueDate,
      expirationDate: newCert.expirationDate || undefined,
      credentialId: newCert.credentialId || undefined,
      credentialUrl: newCert.credentialUrl || undefined,
    });

    setNewCert({
      name: '',
      issuingOrganization: '',
      issueDate: '',
      expirationDate: '',
      credentialId: '',
      credentialUrl: '',
    });
    setShowCertForm(false);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
      {/* Personal Information Section */}
      <section>
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-hubzone-500 to-hubzone-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
            <p className="text-sm text-gray-500">Basic contact details</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* First Name */}
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              {...register('firstName')}
              type="text"
              id="firstName"
              placeholder="John"
              className={`w-full px-4 py-3 rounded-xl border ${
                errors.firstName ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-hubzone-500'
              } focus:border-transparent focus:outline-none focus:ring-2 transition-colors`}
            />
            {errors.firstName && (
              <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
            )}
          </div>

          {/* Last Name */}
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              {...register('lastName')}
              type="text"
              id="lastName"
              placeholder="Doe"
              className={`w-full px-4 py-3 rounded-xl border ${
                errors.lastName ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-hubzone-500'
              } focus:border-transparent focus:outline-none focus:ring-2 transition-colors`}
            />
            {errors.lastName && (
              <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              {...register('email')}
              type="email"
              id="email"
              placeholder="john.doe@example.com"
              className={`w-full px-4 py-3 rounded-xl border ${
                errors.email ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-hubzone-500'
              } focus:border-transparent focus:outline-none focus:ring-2 transition-colors`}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              {...register('phone')}
              type="tel"
              id="phone"
              placeholder="(555) 555-5555"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500 transition-colors"
            />
          </div>

          {/* Headline */}
          <div className="md:col-span-2">
            <label htmlFor="headline" className="block text-sm font-medium text-gray-700 mb-1">
              Professional Headline
            </label>
            <input
              {...register('headline')}
              type="text"
              id="headline"
              placeholder="e.g., Senior Project Manager | PMP Certified | Federal Contracting Expert"
              maxLength={120}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500 transition-colors"
            />
            <p className="mt-1 text-xs text-gray-500">
              A brief headline that appears on your public profile (max 120 characters)
            </p>
          </div>

          {/* Summary */}
          <div className="md:col-span-2">
            <label htmlFor="summary" className="block text-sm font-medium text-gray-700 mb-1">
              Professional Summary
            </label>
            <textarea
              {...register('summary')}
              id="summary"
              rows={4}
              placeholder="Brief overview of your professional background, expertise, and career objectives..."
              maxLength={2000}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500 transition-colors resize-none"
            />
          </div>

          {/* LinkedIn URL */}
          <div className="md:col-span-2">
            <label htmlFor="linkedinUrl" className="block text-sm font-medium text-gray-700 mb-1">
              LinkedIn Profile
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-[#0A66C2]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </div>
              <input
                {...register('linkedinUrl')}
                type="url"
                id="linkedinUrl"
                placeholder="https://linkedin.com/in/yourprofile"
                className={`w-full pl-12 pr-4 py-3 rounded-xl border ${
                  errors.linkedinUrl ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-hubzone-500'
                } focus:border-transparent focus:outline-none focus:ring-2 transition-colors`}
              />
            </div>
            {errors.linkedinUrl && (
              <p className="mt-1 text-sm text-red-600">{errors.linkedinUrl.message}</p>
            )}
          </div>
        </div>
      </section>

      {/* Address Section */}
      <section>
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Current Address</h3>
            <p className="text-sm text-gray-500">Used for HUBZone residency verification</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Street 1 */}
          <div className="md:col-span-2">
            <label htmlFor="street1" className="block text-sm font-medium text-gray-700 mb-1">
              Street Address <span className="text-red-500">*</span>
            </label>
            <input
              {...register('currentAddress.street1')}
              type="text"
              id="street1"
              placeholder="123 Main Street"
              className={`w-full px-4 py-3 rounded-xl border ${
                errors.currentAddress?.street1 ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-hubzone-500'
              } focus:border-transparent focus:outline-none focus:ring-2 transition-colors`}
            />
            {errors.currentAddress?.street1 && (
              <p className="mt-1 text-sm text-red-600">{errors.currentAddress.street1.message}</p>
            )}
          </div>

          {/* Street 2 */}
          <div className="md:col-span-2">
            <label htmlFor="street2" className="block text-sm font-medium text-gray-700 mb-1">
              Apartment / Suite / Unit
            </label>
            <input
              {...register('currentAddress.street2')}
              type="text"
              id="street2"
              placeholder="Apt 4B"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500 transition-colors"
            />
          </div>

          {/* City */}
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
              City <span className="text-red-500">*</span>
            </label>
            <input
              {...register('currentAddress.city')}
              type="text"
              id="city"
              placeholder="Washington"
              className={`w-full px-4 py-3 rounded-xl border ${
                errors.currentAddress?.city ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-hubzone-500'
              } focus:border-transparent focus:outline-none focus:ring-2 transition-colors`}
            />
            {errors.currentAddress?.city && (
              <p className="mt-1 text-sm text-red-600">{errors.currentAddress.city.message}</p>
            )}
          </div>

          {/* State */}
          <div>
            <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
              State <span className="text-red-500">*</span>
            </label>
            <Controller
              name="currentAddress.state"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  id="state"
                  className={`w-full px-4 py-3 rounded-xl border ${
                    errors.currentAddress?.state ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-hubzone-500'
                  } focus:border-transparent focus:outline-none focus:ring-2 transition-colors bg-white`}
                >
                  <option value="">Select state</option>
                  {usStates.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              )}
            />
            {errors.currentAddress?.state && (
              <p className="mt-1 text-sm text-red-600">{errors.currentAddress.state.message}</p>
            )}
          </div>

          {/* ZIP Code */}
          <div>
            <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-1">
              ZIP Code <span className="text-red-500">*</span>
            </label>
            <input
              {...register('currentAddress.zipCode')}
              type="text"
              id="zipCode"
              placeholder="20001"
              maxLength={10}
              className={`w-full px-4 py-3 rounded-xl border ${
                errors.currentAddress?.zipCode ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-hubzone-500'
              } focus:border-transparent focus:outline-none focus:ring-2 transition-colors`}
            />
            {errors.currentAddress?.zipCode && (
              <p className="mt-1 text-sm text-red-600">{errors.currentAddress.zipCode.message}</p>
            )}
          </div>
        </div>
      </section>

      {/* Skills Section */}
      <section>
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Skills</h3>
            <p className="text-sm text-gray-500">Add your professional skills for job matching</p>
          </div>
        </div>

        {/* Skill Search */}
        <div className="relative mb-4">
          <div className="flex gap-3 mb-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={skillSearch}
                onChange={(e) => setSkillSearch(e.target.value)}
                onFocus={() => setShowSkillDropdown(true)}
                onBlur={() => setTimeout(() => setShowSkillDropdown(false), 200)}
                placeholder="Search skills..."
                className="w-full px-4 py-3 pl-10 rounded-xl border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500 transition-colors"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <select
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value || null)}
              className="px-4 py-3 rounded-xl border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500 transition-colors bg-white"
            >
              <option value="">All Categories</option>
              {skillCategories.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* Skills Dropdown */}
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
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                    {skill.category}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Skills */}
        {skillFields.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {skillFields.map((field, index) => (
              <div
                key={field.id}
                className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-xl group"
              >
                <span className="text-sm font-medium text-violet-800">{field.name}</span>
                <button
                  type="button"
                  onClick={() => removeSkill(index)}
                  className="text-violet-400 hover:text-red-500 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <svg
              className="mx-auto h-12 w-12 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">No skills added yet</p>
            <p className="text-xs text-gray-400">Search above to add your professional skills</p>
          </div>
        )}
      </section>

      {/* Certifications Section */}
      <section>
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Certifications</h3>
            <p className="text-sm text-gray-500">Professional certifications and licenses</p>
          </div>
        </div>

        {/* Certification List */}
        {certFields.length > 0 && (
          <div className="space-y-3 mb-4">
            {certFields.map((field, index) => (
              <div
                key={field.id}
                className="flex items-start justify-between p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl"
              >
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{field.name}</h4>
                  <p className="text-sm text-gray-600">{field.issuingOrganization}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>Issued: {new Date(field.issueDate).toLocaleDateString()}</span>
                    {field.expirationDate && (
                      <span>Expires: {new Date(field.expirationDate).toLocaleDateString()}</span>
                    )}
                    {field.credentialId && (
                      <span>ID: {field.credentialId}</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeCert(index)}
                  className="ml-3 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add Certification Form */}
        {showCertForm ? (
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Certification Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCert.name}
                  onChange={(e) => setNewCert({ ...newCert, name: e.target.value })}
                  placeholder="e.g., PMP, AWS Solutions Architect"
                  list="common-certs"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                />
                <datalist id="common-certs">
                  {COMMON_CERTIFICATIONS.map((cert) => (
                    <option key={cert} value={cert} />
                  ))}
                </datalist>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Issuing Organization <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCert.issuingOrganization}
                  onChange={(e) => setNewCert({ ...newCert, issuingOrganization: e.target.value })}
                  placeholder="e.g., PMI, Amazon Web Services"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Issue Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={newCert.issueDate}
                  onChange={(e) => setNewCert({ ...newCert, issueDate: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiration Date
                </label>
                <input
                  type="date"
                  value={newCert.expirationDate}
                  onChange={(e) => setNewCert({ ...newCert, expirationDate: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Credential ID
                </label>
                <input
                  type="text"
                  value={newCert.credentialId}
                  onChange={(e) => setNewCert({ ...newCert, credentialId: e.target.value })}
                  placeholder="Certificate number"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Credential URL
                </label>
                <input
                  type="url"
                  value={newCert.credentialUrl}
                  onChange={(e) => setNewCert({ ...newCert, credentialUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCertForm(false);
                  setNewCert({
                    name: '',
                    issuingOrganization: '',
                    issueDate: '',
                    expirationDate: '',
                    credentialId: '',
                    credentialUrl: '',
                  });
                }}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCertification}
                disabled={!newCert.name || !newCert.issuingOrganization || !newCert.issueDate}
                className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Certification
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowCertForm(true)}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Certification
          </button>
        )}
      </section>

      {/* Resume Upload Section */}
      <section>
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Resume</h3>
            <p className="text-sm text-gray-500">Upload your resume (PDF or Word, max 5MB)</p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleResumeUpload}
          className="hidden"
        />

        {resumeUrl ? (
          <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Resume uploaded</p>
                <a
                  href={resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View resume →
                </a>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingResume}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800"
              >
                Replace
              </button>
              {onResumeDelete && (
                <button
                  type="button"
                  onClick={onResumeDelete}
                  className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingResume}
            className="w-full py-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 transition-colors flex flex-col items-center justify-center gap-2"
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
                <span className="text-gray-500">Click to upload resume</span>
                <span className="text-xs text-gray-400">PDF or Word document, max 5MB</span>
              </>
            )}
          </button>
        )}
      </section>

      {/* Profile Visibility */}
      <section>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div>
            <h4 className="font-medium text-gray-900">Profile Visibility</h4>
            <p className="text-sm text-gray-500">Allow businesses to find your profile for hiring</p>
          </div>
          <Controller
            name="isPublic"
            control={control}
            render={({ field }) => (
              <button
                type="button"
                onClick={() => field.onChange(!field.value)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  field.value ? 'bg-hubzone-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    field.value ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            )}
          />
        </div>
      </section>

      {/* Form Actions */}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-6 border-t border-gray-200">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading || isSubmitting}
            className="px-6 py-3 text-gray-700 font-medium rounded-xl border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading || isSubmitting}
          className="px-6 py-3 bg-hubzone-600 text-white font-medium rounded-xl shadow-lg shadow-hubzone-500/25 hover:bg-hubzone-700 focus:outline-none focus:ring-2 focus:ring-hubzone-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isLoading || isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving...
            </span>
          ) : (
            'Save Profile'
          )}
        </button>
      </div>
    </form>
  );
}

export { ProfileForm };

