import { useAuthContext } from '../context/AuthContext';

/**
 * Custom hook for accessing authentication state and methods
 * Returns: user, isAuthenticated, login, logout, loading, error, register
 */
export function useAuth() {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    register,
    clearError,
    refreshUser,
  } = useAuthContext();

  return {
    // State
    user,
    isAuthenticated,
    loading: isLoading,
    error,

    // Methods
    login,
    logout,
    register,
    clearError,
    refreshUser,

    // Derived state
    isAdmin: user?.role === 'admin',
    isReviewer: user?.role === 'reviewer' || user?.role === 'admin',
  };
}

export default useAuth;

