import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authService } from '../services/authService';

type VerificationStatus = 'verifying' | 'success' | 'error' | 'no-token';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<VerificationStatus>(token ? 'verifying' : 'no-token');
  const [error, setError] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setStatus('no-token');
        return;
      }

      try {
        await authService.verifyEmail(token);
        setStatus('success');
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Verification failed');
      }
    };

    if (token) {
      verifyToken();
    }
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) return;

    setResendLoading(true);
    setResendSuccess(false);

    try {
      await authService.resendVerificationEmail(resendEmail);
      setResendSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend email');
    } finally {
      setResendLoading(false);
    }
  };

  // Verifying state
  if (status === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-federal-500 via-hubzone-700 to-hubzone-900 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-hubzone-100 rounded-full mb-6">
              <svg
                className="w-8 h-8 text-hubzone-600 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">
              Verifying your email...
            </h2>
            <p className="text-gray-600">
              Please wait while we verify your email address.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-federal-500 via-hubzone-700 to-hubzone-900 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-verified-100 rounded-full mb-6">
              <svg
                className="w-8 h-8 text-verified-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">
              Email Verified!
            </h2>
            <p className="text-gray-600 mb-8">
              Your email has been successfully verified. You can now access all features of HZ Navigator.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center justify-center w-full py-3 px-4 bg-hubzone-600 hover:bg-hubzone-700 text-white font-medium rounded-xl shadow-lg shadow-hubzone-500/25 transition-all duration-200"
            >
              Continue to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Error or no-token state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-federal-500 via-hubzone-700 to-hubzone-900 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 animate-fade-in">
          {/* Error Icon */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">
              {status === 'no-token' ? 'Missing Verification Token' : 'Verification Failed'}
            </h2>
            <p className="text-gray-600">
              {status === 'no-token'
                ? 'No verification token was provided. Please check your email for the verification link.'
                : error || 'The verification link may have expired or is invalid.'}
            </p>
          </div>

          {/* Resend Form */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 text-center">
              Request a new verification email
            </h3>

            {resendSuccess ? (
              <div className="p-4 bg-verified-50 border border-verified-200 rounded-xl text-center">
                <svg
                  className="w-6 h-6 text-verified-600 mx-auto mb-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-sm text-verified-700">
                  Verification email sent! Please check your inbox.
                </p>
              </div>
            ) : (
              <form onSubmit={handleResend} className="space-y-4">
                <div>
                  <label
                    htmlFor="resendEmail"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email Address
                  </label>
                  <input
                    id="resendEmail"
                    name="resendEmail"
                    type="email"
                    required
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-hubzone-500 focus:border-hubzone-500 transition-colors duration-200 focus:outline-none focus:ring-2"
                    placeholder="you@example.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={resendLoading}
                  className="w-full py-3 px-4 bg-hubzone-600 hover:bg-hubzone-700 disabled:bg-hubzone-400 text-white font-medium rounded-xl shadow-lg shadow-hubzone-500/25 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-hubzone-500 focus:ring-offset-2 disabled:cursor-not-allowed"
                >
                  {resendLoading ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    'Resend Verification Email'
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Back to Login */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <Link
              to="/login"
              className="inline-flex items-center text-hubzone-600 hover:text-hubzone-700 font-medium transition-colors"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to login
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-hubzone-200 text-sm mt-8">
          © {new Date().getFullYear()} HZ Navigator. All rights reserved.
        </p>
      </div>
    </div>
  );
}

