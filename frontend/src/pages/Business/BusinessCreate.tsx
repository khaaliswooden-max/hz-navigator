import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BusinessForm } from '../../components/Business/BusinessForm';
import businessService from '../../services/businessService';
import type { BusinessFormData } from '../../types/business';

type ToastType = 'success' | 'error';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

export default function BusinessCreate() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Toast helper
  const showToast = useCallback((type: ToastType, message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleSubmit = async (data: BusinessFormData) => {
    setIsSubmitting(true);

    try {
      const response = await businessService.createBusiness(data);
      
      if (response.success && response.data) {
        showToast('success', 'Business profile created successfully');
        // Navigate to the new business profile after a brief delay
        setTimeout(() => {
          navigate(`/businesses/${response.data!.id}`);
        }, 1000);
      } else {
        showToast('error', response.error?.message || 'Failed to create business profile');
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/businesses');
  };

  return (
    <div className="space-y-6">
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg ${
              toast.type === 'success' 
                ? 'bg-verified-50 border border-verified-200' 
                : 'bg-red-50 border border-red-200'
            } animate-fade-in`}
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
            <span className={`text-sm font-medium ${
              toast.type === 'success' ? 'text-verified-800' : 'text-red-800'
            }`}>
              {toast.message}
            </span>
            <button
              onClick={() => removeToast(toast.id)}
              className={`ml-2 ${
                toast.type === 'success' ? 'text-verified-600 hover:text-verified-800' : 'text-red-600 hover:text-red-800'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <Link to="/businesses" className="hover:text-gray-700">Businesses</Link>
          <span>/</span>
          <span className="text-gray-700">New Business</span>
        </div>
        <h1 className="text-2xl font-display font-bold text-gray-900">
          Create Business Profile
        </h1>
        <p className="text-gray-500 mt-1">
          Enter your business information to get started with HUBZone certification
        </p>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <BusinessForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isSubmitting}
          mode="create"
        />
      </div>
    </div>
  );
}

export { BusinessCreate };

