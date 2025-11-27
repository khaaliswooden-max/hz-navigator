import { useState, useCallback, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { businessFormSchema, type BusinessFormData, type NAICSCode, type OwnershipType } from '../../types/business';
import businessService from '../../services/businessService';

interface BusinessFormProps {
  initialData?: Partial<BusinessFormData>;
  onSubmit: (data: BusinessFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

// Common NAICS codes for quick selection
const commonNAICSCodes: NAICSCode[] = [
  { code: '541512', title: 'Computer Systems Design Services' },
  { code: '541511', title: 'Custom Computer Programming Services' },
  { code: '541330', title: 'Engineering Services' },
  { code: '541611', title: 'Administrative Management Consulting Services' },
  { code: '541618', title: 'Other Management Consulting Services' },
  { code: '541990', title: 'All Other Professional, Scientific, and Technical Services' },
  { code: '238220', title: 'Plumbing, Heating, and Air-Conditioning Contractors' },
  { code: '236220', title: 'Commercial and Institutional Building Construction' },
];

const ownershipTypes: { value: OwnershipType; label: string }[] = [
  { value: 'sole_proprietor', label: 'Sole Proprietor' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'llc', label: 'Limited Liability Company (LLC)' },
  { value: 'corporation', label: 'Corporation' },
  { value: 's_corporation', label: 'S Corporation' },
  { value: 'non_profit', label: 'Non-Profit' },
  { value: 'other', label: 'Other' },
];

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

export default function BusinessForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  mode = 'create',
}: BusinessFormProps) {
  const [naicsSearch, setNaicsSearch] = useState('');
  const [naicsResults, setNaicsResults] = useState<NAICSCode[]>([]);
  const [isSearchingNaics, setIsSearchingNaics] = useState(false);
  const [showNaicsDropdown, setShowNaicsDropdown] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<{ street1: string; city: string; state: string; zipCode: string }[]>([]);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);

  const defaultValues: Partial<BusinessFormData> = {
    legalName: '',
    dbaName: '',
    ueiNumber: '',
    cageCode: '',
    phone: '',
    email: '',
    website: '',
    principalOffice: {
      street1: '',
      street2: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US',
    },
    ownershipType: 'llc',
    dateEstablished: '',
    employeeCount: undefined,
    naicsCodes: [],
    ...initialData,
  };

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting, isDirty },
    setValue,
    watch,
    trigger,
  } = useForm<BusinessFormData>({
    resolver: zodResolver(businessFormSchema),
    defaultValues,
    mode: 'onChange',
  });

  const { fields: naicsFields, append: appendNaics, remove: removeNaics } = useFieldArray({
    control,
    name: 'naicsCodes',
  });

  const watchedAddress = watch('principalOffice.street1');

  // Search NAICS codes
  const searchNaics = useCallback(async (query: string) => {
    if (query.length < 2) {
      setNaicsResults([]);
      return;
    }

    setIsSearchingNaics(true);
    try {
      const results = await businessService.searchNAICS(query);
      setNaicsResults(results.slice(0, 10));
    } catch (error) {
      // Fallback to filtering common codes
      const filtered = commonNAICSCodes.filter(
        c => c.code.includes(query) || c.title.toLowerCase().includes(query.toLowerCase())
      );
      setNaicsResults(filtered);
    } finally {
      setIsSearchingNaics(false);
    }
  }, []);

  // Debounced NAICS search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchNaics(naicsSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [naicsSearch, searchNaics]);

  // Address autocomplete
  const searchAddress = useCallback(async (query: string) => {
    if (query.length < 5) {
      setAddressSuggestions([]);
      return;
    }

    try {
      const results = await businessService.autocompleteAddress(query);
      setAddressSuggestions(results.slice(0, 5));
    } catch {
      setAddressSuggestions([]);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (watchedAddress) {
        searchAddress(watchedAddress);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [watchedAddress, searchAddress]);

  const handleAddNaics = (code: NAICSCode) => {
    const exists = naicsFields.some(f => f.code === code.code);
    if (!exists) {
      appendNaics({ ...code, isPrimary: naicsFields.length === 0 });
    }
    setNaicsSearch('');
    setShowNaicsDropdown(false);
  };

  const handleSelectAddress = (address: typeof addressSuggestions[0]) => {
    setValue('principalOffice.street1', address.street1);
    setValue('principalOffice.city', address.city);
    setValue('principalOffice.state', address.state);
    setValue('principalOffice.zipCode', address.zipCode);
    setShowAddressDropdown(false);
    trigger('principalOffice');
  };

  const handleFormSubmit = async (data: BusinessFormData) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
      {/* Basic Information Section */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
          Basic Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Legal Name */}
          <div className="md:col-span-2">
            <label htmlFor="legalName" className="block text-sm font-medium text-gray-700 mb-1">
              Legal Business Name <span className="text-red-500">*</span>
            </label>
            <input
              {...register('legalName')}
              type="text"
              id="legalName"
              placeholder="Enter legal business name"
              className={`w-full px-4 py-3 rounded-xl border ${
                errors.legalName ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-hubzone-500'
              } focus:border-transparent focus:outline-none focus:ring-2 transition-colors`}
            />
            {errors.legalName && (
              <p className="mt-1 text-sm text-red-600">{errors.legalName.message}</p>
            )}
          </div>

          {/* DBA Name */}
          <div className="md:col-span-2">
            <label htmlFor="dbaName" className="block text-sm font-medium text-gray-700 mb-1">
              DBA Name (Doing Business As)
            </label>
            <input
              {...register('dbaName')}
              type="text"
              id="dbaName"
              placeholder="Enter DBA name if different from legal name"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500 transition-colors"
            />
          </div>

          {/* UEI Number */}
          <div>
            <label htmlFor="ueiNumber" className="block text-sm font-medium text-gray-700 mb-1">
              UEI Number <span className="text-red-500">*</span>
            </label>
            <input
              {...register('ueiNumber')}
              type="text"
              id="ueiNumber"
              placeholder="12-character UEI"
              maxLength={12}
              className={`w-full px-4 py-3 rounded-xl border uppercase ${
                errors.ueiNumber ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-hubzone-500'
              } focus:border-transparent focus:outline-none focus:ring-2 transition-colors`}
            />
            {errors.ueiNumber && (
              <p className="mt-1 text-sm text-red-600">{errors.ueiNumber.message}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Unique Entity ID from SAM.gov
            </p>
          </div>

          {/* CAGE Code */}
          <div>
            <label htmlFor="cageCode" className="block text-sm font-medium text-gray-700 mb-1">
              CAGE Code
            </label>
            <input
              {...register('cageCode')}
              type="text"
              id="cageCode"
              placeholder="5-character CAGE"
              maxLength={5}
              className={`w-full px-4 py-3 rounded-xl border uppercase ${
                errors.cageCode ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-hubzone-500'
              } focus:border-transparent focus:outline-none focus:ring-2 transition-colors`}
            />
            {errors.cageCode && (
              <p className="mt-1 text-sm text-red-600">{errors.cageCode.message}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Business Phone <span className="text-red-500">*</span>
            </label>
            <input
              {...register('phone')}
              type="tel"
              id="phone"
              placeholder="(555) 555-5555"
              className={`w-full px-4 py-3 rounded-xl border ${
                errors.phone ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-hubzone-500'
              } focus:border-transparent focus:outline-none focus:ring-2 transition-colors`}
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Business Email
            </label>
            <input
              {...register('email')}
              type="email"
              id="email"
              placeholder="contact@company.com"
              className={`w-full px-4 py-3 rounded-xl border ${
                errors.email ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-hubzone-500'
              } focus:border-transparent focus:outline-none focus:ring-2 transition-colors`}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* Website */}
          <div className="md:col-span-2">
            <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
              Website
            </label>
            <input
              {...register('website')}
              type="url"
              id="website"
              placeholder="https://www.example.com"
              className={`w-full px-4 py-3 rounded-xl border ${
                errors.website ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-hubzone-500'
              } focus:border-transparent focus:outline-none focus:ring-2 transition-colors`}
            />
            {errors.website && (
              <p className="mt-1 text-sm text-red-600">{errors.website.message}</p>
            )}
          </div>
        </div>
      </section>

      {/* Principal Office Address Section */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
          Principal Office Address
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Street 1 with autocomplete */}
          <div className="md:col-span-2 relative">
            <label htmlFor="street1" className="block text-sm font-medium text-gray-700 mb-1">
              Street Address <span className="text-red-500">*</span>
            </label>
            <input
              {...register('principalOffice.street1')}
              type="text"
              id="street1"
              placeholder="Start typing to search..."
              onFocus={() => setShowAddressDropdown(true)}
              onBlur={() => setTimeout(() => setShowAddressDropdown(false), 200)}
              className={`w-full px-4 py-3 rounded-xl border ${
                errors.principalOffice?.street1 ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-hubzone-500'
              } focus:border-transparent focus:outline-none focus:ring-2 transition-colors`}
            />
            {showAddressDropdown && addressSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white rounded-xl border border-gray-200 shadow-lg max-h-60 overflow-auto">
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
            {errors.principalOffice?.street1 && (
              <p className="mt-1 text-sm text-red-600">{errors.principalOffice.street1.message}</p>
            )}
          </div>

          {/* Street 2 */}
          <div className="md:col-span-2">
            <label htmlFor="street2" className="block text-sm font-medium text-gray-700 mb-1">
              Suite / Unit / Floor
            </label>
            <input
              {...register('principalOffice.street2')}
              type="text"
              id="street2"
              placeholder="Suite 100"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500 transition-colors"
            />
          </div>

          {/* City */}
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
              City <span className="text-red-500">*</span>
            </label>
            <input
              {...register('principalOffice.city')}
              type="text"
              id="city"
              placeholder="City"
              className={`w-full px-4 py-3 rounded-xl border ${
                errors.principalOffice?.city ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-hubzone-500'
              } focus:border-transparent focus:outline-none focus:ring-2 transition-colors`}
            />
            {errors.principalOffice?.city && (
              <p className="mt-1 text-sm text-red-600">{errors.principalOffice.city.message}</p>
            )}
          </div>

          {/* State */}
          <div>
            <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
              State <span className="text-red-500">*</span>
            </label>
            <Controller
              name="principalOffice.state"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  id="state"
                  className={`w-full px-4 py-3 rounded-xl border ${
                    errors.principalOffice?.state ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-hubzone-500'
                  } focus:border-transparent focus:outline-none focus:ring-2 transition-colors bg-white`}
                >
                  <option value="">Select state</option>
                  {usStates.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              )}
            />
            {errors.principalOffice?.state && (
              <p className="mt-1 text-sm text-red-600">{errors.principalOffice.state.message}</p>
            )}
          </div>

          {/* ZIP Code */}
          <div>
            <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-1">
              ZIP Code <span className="text-red-500">*</span>
            </label>
            <input
              {...register('principalOffice.zipCode')}
              type="text"
              id="zipCode"
              placeholder="12345"
              maxLength={10}
              className={`w-full px-4 py-3 rounded-xl border ${
                errors.principalOffice?.zipCode ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-hubzone-500'
              } focus:border-transparent focus:outline-none focus:ring-2 transition-colors`}
            />
            {errors.principalOffice?.zipCode && (
              <p className="mt-1 text-sm text-red-600">{errors.principalOffice.zipCode.message}</p>
            )}
          </div>
        </div>
      </section>

      {/* Business Details Section */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
          Business Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Ownership Type */}
          <div>
            <label htmlFor="ownershipType" className="block text-sm font-medium text-gray-700 mb-1">
              Ownership Type <span className="text-red-500">*</span>
            </label>
            <Controller
              name="ownershipType"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  id="ownershipType"
                  className={`w-full px-4 py-3 rounded-xl border ${
                    errors.ownershipType ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-hubzone-500'
                  } focus:border-transparent focus:outline-none focus:ring-2 transition-colors bg-white`}
                >
                  {ownershipTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              )}
            />
            {errors.ownershipType && (
              <p className="mt-1 text-sm text-red-600">{errors.ownershipType.message}</p>
            )}
          </div>

          {/* Date Established */}
          <div>
            <label htmlFor="dateEstablished" className="block text-sm font-medium text-gray-700 mb-1">
              Date Established
            </label>
            <input
              {...register('dateEstablished')}
              type="date"
              id="dateEstablished"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500 transition-colors"
            />
          </div>

          {/* Employee Count */}
          <div>
            <label htmlFor="employeeCount" className="block text-sm font-medium text-gray-700 mb-1">
              Number of Employees
            </label>
            <Controller
              name="employeeCount"
              control={control}
              render={({ field: { onChange, value, ...field } }) => (
                <input
                  {...field}
                  type="number"
                  id="employeeCount"
                  min={0}
                  value={value ?? ''}
                  onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="Total employees"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500 transition-colors"
                />
              )}
            />
          </div>
        </div>
      </section>

      {/* NAICS Codes Section */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
          NAICS Codes <span className="text-red-500">*</span>
        </h3>
        
        {/* Search NAICS */}
        <div className="relative mb-4">
          <label htmlFor="naicsSearch" className="block text-sm font-medium text-gray-700 mb-1">
            Search and Add NAICS Codes
          </label>
          <div className="relative">
            <input
              type="text"
              id="naicsSearch"
              value={naicsSearch}
              onChange={(e) => setNaicsSearch(e.target.value)}
              onFocus={() => setShowNaicsDropdown(true)}
              onBlur={() => setTimeout(() => setShowNaicsDropdown(false), 200)}
              placeholder="Search by code or description..."
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
            {isSearchingNaics && (
              <svg
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
          </div>

          {/* NAICS Dropdown */}
          {showNaicsDropdown && (naicsResults.length > 0 || naicsSearch.length < 2) && (
            <div className="absolute z-10 w-full mt-1 bg-white rounded-xl border border-gray-200 shadow-lg max-h-60 overflow-auto">
              {naicsSearch.length < 2 ? (
                <>
                  <div className="px-4 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b">
                    Common NAICS Codes
                  </div>
                  {commonNAICSCodes.map(code => (
                    <button
                      key={code.code}
                      type="button"
                      onClick={() => handleAddNaics(code)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                    >
                      <span className="font-mono text-sm text-hubzone-600">{code.code}</span>
                      <span className="text-sm text-gray-600 ml-2">{code.title}</span>
                    </button>
                  ))}
                </>
              ) : (
                naicsResults.map(code => (
                  <button
                    key={code.code}
                    type="button"
                    onClick={() => handleAddNaics(code)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                  >
                    <span className="font-mono text-sm text-hubzone-600">{code.code}</span>
                    <span className="text-sm text-gray-600 ml-2">{code.title}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Selected NAICS Codes */}
        {errors.naicsCodes && (
          <p className="mb-2 text-sm text-red-600">{errors.naicsCodes.message}</p>
        )}
        
        {naicsFields.length > 0 ? (
          <div className="space-y-2">
            {naicsFields.map((field, index) => (
              <div
                key={field.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200"
              >
                <div className="flex items-center gap-3">
                  {field.isPrimary && (
                    <span className="px-2 py-0.5 bg-hubzone-100 text-hubzone-700 text-xs font-medium rounded-full">
                      Primary
                    </span>
                  )}
                  <span className="font-mono text-sm text-hubzone-600">{field.code}</span>
                  <span className="text-sm text-gray-600">{field.title}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeNaics(index)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
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
            <svg
              className="mx-auto h-12 w-12 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">No NAICS codes added yet</p>
            <p className="text-xs text-gray-400">Search above to add your business codes</p>
          </div>
        )}
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
          disabled={isLoading || isSubmitting || (!isDirty && mode === 'edit')}
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
          ) : mode === 'create' ? (
            'Create Business'
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </form>
  );
}

export { BusinessForm };

