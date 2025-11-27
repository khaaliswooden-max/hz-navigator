import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  ownerFormSchema, 
  type OwnerFormData, 
  type Owner,
  validateOwnerChange 
} from '../../types/ownership';

interface OwnerFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: OwnerFormData) => Promise<void>;
  initialData?: Partial<OwnerFormData>;
  editingOwner?: Owner;
  currentOwners: Owner[];
  mode?: 'create' | 'edit';
  isLoading?: boolean;
}

export default function OwnerForm({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  editingOwner,
  currentOwners,
  mode = 'create',
  isLoading = false,
}: OwnerFormProps) {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Calculate remaining percentage available
  const remainingPercentage = useMemo(() => {
    const otherOwners = editingOwner 
      ? currentOwners.filter(o => o.id !== editingOwner.id)
      : currentOwners;
    const usedPercentage = otherOwners.reduce((sum, o) => sum + o.ownershipPercentage, 0);
    return Math.max(0, 100 - usedPercentage);
  }, [currentOwners, editingOwner]);

  const defaultValues: OwnerFormData = {
    ownerName: '',
    ownershipPercentage: Math.min(remainingPercentage, 25),
    isUsCitizen: true,
    isControlPerson: false,
    title: '',
    email: '',
    phone: '',
    ...initialData,
  };

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    watch,
    reset,
    setValue,
  } = useForm<OwnerFormData>({
    resolver: zodResolver(ownerFormSchema),
    defaultValues,
    mode: 'onChange',
  });

  const watchedPercentage = watch('ownershipPercentage');
  const watchedCitizen = watch('isUsCitizen');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      reset(defaultValues);
      setValidationErrors([]);
    }
  }, [isOpen]);

  // Validate in real-time
  useEffect(() => {
    const validation = validateOwnerChange(
      currentOwners,
      { 
        ownerName: 'temp', 
        ownershipPercentage: watchedPercentage,
        isUsCitizen: watchedCitizen,
        isControlPerson: false,
      },
      editingOwner?.id
    );
    setValidationErrors(validation.errors);
  }, [watchedPercentage, watchedCitizen, currentOwners, editingOwner]);

  // Calculate what totals would be with this change
  const projectedTotals = useMemo(() => {
    const otherOwners = editingOwner 
      ? currentOwners.filter(o => o.id !== editingOwner.id)
      : currentOwners;
    
    const currentTotal = otherOwners.reduce((sum, o) => sum + o.ownershipPercentage, 0);
    const currentUsCitizen = otherOwners
      .filter(o => o.isUsCitizen)
      .reduce((sum, o) => sum + o.ownershipPercentage, 0);
    
    return {
      totalWithNew: currentTotal + watchedPercentage,
      usCitizenWithNew: watchedCitizen 
        ? currentUsCitizen + watchedPercentage 
        : currentUsCitizen,
    };
  }, [currentOwners, editingOwner, watchedPercentage, watchedCitizen]);

  const handleFormSubmit = async (data: OwnerFormData) => {
    if (validationErrors.length > 0) return;
    await onSubmit(data);
  };

  const handlePercentageSlider = (value: number) => {
    setValue('ownershipPercentage', value, { shouldValidate: true });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {mode === 'create' ? 'Add Owner' : 'Edit Owner'}
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
          <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-5">
            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                {validationErrors.map((error, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm text-red-700">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Projected Totals Preview */}
            <div className={`p-4 rounded-xl border ${
              projectedTotals.totalWithNew > 100.01
                ? 'bg-red-50 border-red-200'
                : projectedTotals.totalWithNew < 100
                ? 'bg-amber-50 border-amber-200'
                : projectedTotals.usCitizenWithNew < 51
                ? 'bg-amber-50 border-amber-200'
                : 'bg-verified-50 border-verified-200'
            }`}>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Projected Total</p>
                  <p className={`text-lg font-bold ${
                    projectedTotals.totalWithNew > 100.01
                      ? 'text-red-600'
                      : projectedTotals.totalWithNew < 100
                      ? 'text-amber-600'
                      : 'text-verified-600'
                  }`}>
                    {projectedTotals.totalWithNew.toFixed(2)}%
                    {projectedTotals.totalWithNew > 100.01 && (
                      <span className="text-xs font-normal ml-1">exceeds 100%</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">US Citizen Total</p>
                  <p className={`text-lg font-bold ${
                    projectedTotals.usCitizenWithNew < 51
                      ? 'text-amber-600'
                      : 'text-verified-600'
                  }`}>
                    {projectedTotals.usCitizenWithNew.toFixed(2)}%
                    {projectedTotals.usCitizenWithNew < 51 && (
                      <span className="text-xs font-normal ml-1">below 51%</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Owner Name */}
            <div>
              <label htmlFor="ownerName" className="block text-sm font-medium text-gray-700 mb-1">
                Owner Name <span className="text-red-500">*</span>
              </label>
              <input
                {...register('ownerName')}
                type="text"
                id="ownerName"
                placeholder="Full legal name"
                className={`w-full px-4 py-2.5 rounded-xl border ${
                  errors.ownerName ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-hubzone-500'
                } focus:border-transparent focus:outline-none focus:ring-2 transition-colors`}
              />
              {errors.ownerName && (
                <p className="mt-1 text-sm text-red-600">{errors.ownerName.message}</p>
              )}
            </div>

            {/* Ownership Percentage */}
            <div>
              <label htmlFor="ownershipPercentage" className="block text-sm font-medium text-gray-700 mb-1">
                Ownership Percentage <span className="text-red-500">*</span>
              </label>
              <div className="space-y-3">
                {/* Slider */}
                <Controller
                  name="ownershipPercentage"
                  control={control}
                  render={({ field }) => (
                    <div className="relative">
                      <input
                        type="range"
                        min="0.01"
                        max={Math.min(remainingPercentage + (editingOwner?.ownershipPercentage || 0), 100)}
                        step="0.01"
                        value={field.value}
                        onChange={(e) => handlePercentageSlider(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-hubzone-600"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>0.01%</span>
                        <span>{Math.min(remainingPercentage + (editingOwner?.ownershipPercentage || 0), 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  )}
                />

                {/* Number input */}
                <div className="flex items-center gap-2">
                  <Controller
                    name="ownershipPercentage"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="number"
                        min="0.01"
                        max="100"
                        step="0.01"
                        value={field.value}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        className={`w-32 px-4 py-2.5 rounded-xl border text-center font-mono ${
                          errors.ownershipPercentage ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-hubzone-500'
                        } focus:border-transparent focus:outline-none focus:ring-2 transition-colors`}
                      />
                    )}
                  />
                  <span className="text-gray-500 font-medium">%</span>
                  <span className="text-sm text-gray-400 ml-2">
                    (Available: {remainingPercentage.toFixed(2)}%)
                  </span>
                </div>
              </div>
              {errors.ownershipPercentage && (
                <p className="mt-1 text-sm text-red-600">{errors.ownershipPercentage.message}</p>
              )}
            </div>

            {/* US Citizen Toggle */}
            <div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <p className="font-medium text-gray-900">US Citizen</p>
                  <p className="text-sm text-gray-500">Is this owner a US citizen?</p>
                </div>
                <Controller
                  name="isUsCitizen"
                  control={control}
                  render={({ field }) => (
                    <button
                      type="button"
                      onClick={() => field.onChange(!field.value)}
                      className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                        field.value ? 'bg-verified-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                          field.value ? 'translate-x-8' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  )}
                />
              </div>
              {!watchedCitizen && projectedTotals.usCitizenWithNew < 51 && (
                <p className="mt-2 text-sm text-amber-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Adding this non-citizen owner would reduce US citizen ownership below 51%
                </p>
              )}
            </div>

            {/* Control Person Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div>
                <p className="font-medium text-gray-900">Control Person</p>
                <p className="text-sm text-gray-500">Has management control of the business</p>
              </div>
              <Controller
                name="isControlPerson"
                control={control}
                render={({ field }) => (
                  <button
                    type="button"
                    onClick={() => field.onChange(!field.value)}
                    className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                      field.value ? 'bg-hubzone-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                        field.value ? 'translate-x-8' : 'translate-x-1'
                      }`}
                    />
                  </button>
                )}
              />
            </div>

            {/* Optional Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  {...register('title')}
                  type="text"
                  id="title"
                  placeholder="CEO, President, etc."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500 transition-colors"
                />
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
                  placeholder="owner@example.com"
                  className={`w-full px-4 py-2.5 rounded-xl border ${
                    errors.email ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-hubzone-500'
                  } focus:border-transparent focus:outline-none focus:ring-2 transition-colors`}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
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
              disabled={isLoading || isSubmitting || validationErrors.length > 0}
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
                'Add Owner'
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

export { OwnerForm };

