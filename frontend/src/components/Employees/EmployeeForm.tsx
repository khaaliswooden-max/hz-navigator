import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { employeeFormSchema, type EmployeeFormData, type HubzoneResidenceStatus } from '../../types/employee';
import employeeService from '../../services/employeeService';

interface EmployeeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EmployeeFormData) => Promise<void>;
  initialData?: Partial<EmployeeFormData>;
  mode?: 'create' | 'edit';
  isLoading?: boolean;
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

export default function EmployeeForm({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode = 'create',
  isLoading = false,
}: EmployeeFormProps) {
  const [addressSuggestions, setAddressSuggestions] = useState<{
    street1: string;
    city: string;
    state: string;
    zipCode: string;
  }[]>([]);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [hubzoneStatus, setHubzoneStatus] = useState<HubzoneResidenceStatus | null>(null);
  const [isVerifyingHubzone, setIsVerifyingHubzone] = useState(false);
  const [complianceImpact, setComplianceImpact] = useState<{
    impact: 'positive' | 'negative' | 'neutral';
    message: string;
  } | null>(null);

  const defaultValues: EmployeeFormData = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    jobTitle: '',
    department: '',
    employmentDate: new Date().toISOString().split('T')[0],
    currentAddress: {
      street1: '',
      street2: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US',
    },
    ...initialData,
  };

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
    trigger,
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues,
    mode: 'onChange',
  });

  const watchedAddress = watch('currentAddress');

  // Reset form when modal opens/closes or initialData changes
  useEffect(() => {
    if (isOpen) {
      reset(defaultValues);
      setHubzoneStatus(null);
      setComplianceImpact(null);
    }
  }, [isOpen, initialData]);

  // Address autocomplete
  const searchAddress = useCallback(async (query: string) => {
    if (query.length < 5) {
      setAddressSuggestions([]);
      return;
    }

    try {
      const results = await employeeService.autocompleteAddress(query);
      setAddressSuggestions(results.slice(0, 5));
    } catch {
      setAddressSuggestions([]);
    }
  }, []);

  // Verify HUBZone status when address is complete
  const verifyHubzoneStatus = useCallback(async () => {
    if (!watchedAddress.street1 || !watchedAddress.city || !watchedAddress.state || !watchedAddress.zipCode) {
      return;
    }

    setIsVerifyingHubzone(true);
    try {
      const response = await employeeService.verifyHubzoneStatus(watchedAddress);
      if (response.success && response.data) {
        setHubzoneStatus(response.data.isHubzone ? 'resident' : 'non_resident');
        
        // Calculate compliance impact
        const impactResponse = await employeeService.calculateComplianceImpact(
          mode === 'create' ? 'add' : 'add',
          response.data.isHubzone ? 'resident' : 'non_resident'
        );
        if (impactResponse.success && impactResponse.data) {
          setComplianceImpact({
            impact: impactResponse.data.impact,
            message: impactResponse.data.message,
          });
        }
      }
    } catch {
      setHubzoneStatus('unknown');
    } finally {
      setIsVerifyingHubzone(false);
    }
  }, [watchedAddress, mode]);

  // Debounced address search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (watchedAddress.street1) {
        searchAddress(watchedAddress.street1);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [watchedAddress.street1, searchAddress]);

  // Verify HUBZone when address changes
  useEffect(() => {
    const timer = setTimeout(() => {
      verifyHubzoneStatus();
    }, 500);
    return () => clearTimeout(timer);
  }, [watchedAddress.street1, watchedAddress.city, watchedAddress.state, watchedAddress.zipCode, verifyHubzoneStatus]);

  const handleSelectAddress = (address: typeof addressSuggestions[0]) => {
    setValue('currentAddress.street1', address.street1);
    setValue('currentAddress.city', address.city);
    setValue('currentAddress.state', address.state);
    setValue('currentAddress.zipCode', address.zipCode);
    setShowAddressDropdown(false);
    trigger('currentAddress');
  };

  const handleFormSubmit = async (data: EmployeeFormData) => {
    await onSubmit(data);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl transform transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {mode === 'create' ? 'Add New Employee' : 'Edit Employee'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            {/* HUBZone Status Indicator */}
            {(hubzoneStatus || isVerifyingHubzone) && (
              <div className={`p-4 rounded-xl border ${
                isVerifyingHubzone 
                  ? 'bg-gray-50 border-gray-200'
                  : hubzoneStatus === 'resident'
                  ? 'bg-verified-50 border-verified-200'
                  : hubzoneStatus === 'non_resident'
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-3">
                  {isVerifyingHubzone ? (
                    <>
                      <svg className="w-5 h-5 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="text-sm text-gray-600">Verifying HUBZone status...</span>
                    </>
                  ) : hubzoneStatus === 'resident' ? (
                    <>
                      <div className="w-8 h-8 rounded-full bg-verified-100 flex items-center justify-center">
                        <svg className="w-4 h-4 text-verified-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-verified-800">HUBZone Resident</p>
                        <p className="text-xs text-verified-600">Address is in a designated HUBZone area</p>
                      </div>
                    </>
                  ) : hubzoneStatus === 'non_resident' ? (
                    <>
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                        <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-amber-800">Non-HUBZone Resident</p>
                        <p className="text-xs text-amber-600">Address is not in a HUBZone area</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Status Unknown</p>
                        <p className="text-xs text-gray-500">Unable to verify HUBZone status</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Compliance Impact */}
                {complianceImpact && (
                  <div className={`mt-3 pt-3 border-t ${
                    hubzoneStatus === 'resident' ? 'border-verified-200' : 'border-amber-200'
                  }`}>
                    <div className={`flex items-center gap-2 text-sm ${
                      complianceImpact.impact === 'positive' 
                        ? 'text-verified-700'
                        : complianceImpact.impact === 'negative'
                        ? 'text-red-700'
                        : 'text-gray-600'
                    }`}>
                      {complianceImpact.impact === 'positive' ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      ) : complianceImpact.impact === 'negative' ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
                        </svg>
                      )}
                      <span className="font-medium">Compliance Impact:</span>
                      <span>{complianceImpact.message}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Personal Information */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    className={`w-full px-4 py-2.5 rounded-xl border ${
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
                    className={`w-full px-4 py-2.5 rounded-xl border ${
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
                    Email
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    id="email"
                    placeholder="john.doe@example.com"
                    className={`w-full px-4 py-2.5 rounded-xl border ${
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
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Employment Details */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Employment Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Employment Date */}
                <div>
                  <label htmlFor="employmentDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Employment Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('employmentDate')}
                    type="date"
                    id="employmentDate"
                    className={`w-full px-4 py-2.5 rounded-xl border ${
                      errors.employmentDate ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-hubzone-500'
                    } focus:border-transparent focus:outline-none focus:ring-2 transition-colors`}
                  />
                  {errors.employmentDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.employmentDate.message}</p>
                  )}
                </div>

                {/* Job Title */}
                <div>
                  <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 mb-1">
                    Job Title
                  </label>
                  <input
                    {...register('jobTitle')}
                    type="text"
                    id="jobTitle"
                    placeholder="Software Engineer"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500 transition-colors"
                  />
                </div>

                {/* Department */}
                <div>
                  <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <input
                    {...register('department')}
                    type="text"
                    id="department"
                    placeholder="Engineering"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Residential Address</h3>
              <div className="space-y-4">
                {/* Street Address with Autocomplete */}
                <div className="relative">
                  <label htmlFor="street1" className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('currentAddress.street1')}
                    type="text"
                    id="street1"
                    placeholder="Start typing to search..."
                    onFocus={() => setShowAddressDropdown(true)}
                    onBlur={() => setTimeout(() => setShowAddressDropdown(false), 200)}
                    className={`w-full px-4 py-2.5 rounded-xl border ${
                      errors.currentAddress?.street1 ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-hubzone-500'
                    } focus:border-transparent focus:outline-none focus:ring-2 transition-colors`}
                  />
                  {showAddressDropdown && addressSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white rounded-xl border border-gray-200 shadow-lg max-h-48 overflow-auto">
                      {addressSuggestions.map((addr, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectAddress(addr)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                        >
                          <p className="text-sm font-medium text-gray-900">{addr.street1}</p>
                          <p className="text-xs text-gray-500">{addr.city}, {addr.state} {addr.zipCode}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {errors.currentAddress?.street1 && (
                    <p className="mt-1 text-sm text-red-600">{errors.currentAddress.street1.message}</p>
                  )}
                </div>

                {/* Street 2 */}
                <div>
                  <label htmlFor="street2" className="block text-sm font-medium text-gray-700 mb-1">
                    Apartment / Unit
                  </label>
                  <input
                    {...register('currentAddress.street2')}
                    type="text"
                    id="street2"
                    placeholder="Apt 4B"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500 transition-colors"
                  />
                </div>

                {/* City, State, ZIP */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('currentAddress.city')}
                      type="text"
                      id="city"
                      placeholder="City"
                      className={`w-full px-4 py-2.5 rounded-xl border ${
                        errors.currentAddress?.city ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-hubzone-500'
                      } focus:border-transparent focus:outline-none focus:ring-2 transition-colors`}
                    />
                    {errors.currentAddress?.city && (
                      <p className="mt-1 text-sm text-red-600">{errors.currentAddress.city.message}</p>
                    )}
                  </div>

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
                          className={`w-full px-4 py-2.5 rounded-xl border ${
                            errors.currentAddress?.state ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-hubzone-500'
                          } focus:border-transparent focus:outline-none focus:ring-2 transition-colors bg-white`}
                        >
                          <option value="">Select</option>
                          {usStates.map(s => (
                            <option key={s.value} value={s.value}>{s.value}</option>
                          ))}
                        </select>
                      )}
                    />
                    {errors.currentAddress?.state && (
                      <p className="mt-1 text-sm text-red-600">{errors.currentAddress.state.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-1">
                      ZIP Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('currentAddress.zipCode')}
                      type="text"
                      id="zipCode"
                      placeholder="12345"
                      maxLength={10}
                      className={`w-full px-4 py-2.5 rounded-xl border ${
                        errors.currentAddress?.zipCode ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-hubzone-500'
                      } focus:border-transparent focus:outline-none focus:ring-2 transition-colors`}
                    />
                    {errors.currentAddress?.zipCode && (
                      <p className="mt-1 text-sm text-red-600">{errors.currentAddress.zipCode.message}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading || isSubmitting}
              className="px-5 py-2.5 text-gray-700 font-medium rounded-xl border border-gray-300 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit(handleFormSubmit)}
              disabled={isLoading || isSubmitting}
              className="px-5 py-2.5 bg-hubzone-600 text-white font-medium rounded-xl shadow-lg shadow-hubzone-500/25 hover:bg-hubzone-700 focus:outline-none focus:ring-2 focus:ring-hubzone-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading || isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </span>
              ) : mode === 'create' ? (
                'Add Employee'
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { EmployeeForm };

