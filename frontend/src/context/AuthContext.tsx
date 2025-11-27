import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService, type LoginResponse } from '../services/authService';
import type { User, UserRole } from '../types';

// Auth context state
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Auth context methods
interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<LoginResponse>;
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role?: UserRole
  ) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

// Create context with undefined default
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Token refresh interval (14 minutes - before 15 min expiry)
const TOKEN_REFRESH_INTERVAL = 14 * 60 * 1000;

// Public routes that don't require redirect after login
const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const refreshIntervalRef = useRef<number | null>(null);

  const [state, setState] = useState<AuthState>({
    user: authService.getStoredUser(),
    isAuthenticated: authService.isAuthenticated(),
    isLoading: true,
    error: null,
  });

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      if (authService.isAuthenticated()) {
        try {
          const user = await authService.getCurrentUser();
          setState((prev) => ({
            ...prev,
            user,
            isAuthenticated: !!user,
            isLoading: false,
          }));
        } catch (error) {
          setState((prev) => ({
            ...prev,
            user: null,
            isAuthenticated: false,
            isLoading: false,
          }));
        }
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
        }));
      }
    };

    initAuth();
  }, []);

  // Set up token refresh interval
  useEffect(() => {
    const setupRefreshInterval = () => {
      if (state.isAuthenticated && !refreshIntervalRef.current) {
        refreshIntervalRef.current = window.setInterval(async () => {
          try {
            await authService.refreshToken();
          } catch (error) {
            console.error('Token refresh failed:', error);
            // Clear auth state if refresh fails
            setState({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: 'Session expired. Please login again.',
            });
            navigate('/login');
          }
        }, TOKEN_REFRESH_INTERVAL);
      }
    };

    const clearRefreshInterval = () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };

    if (state.isAuthenticated) {
      setupRefreshInterval();
    } else {
      clearRefreshInterval();
    }

    return () => {
      clearRefreshInterval();
    };
  }, [state.isAuthenticated, navigate]);

  // Redirect on auth state change
  useEffect(() => {
    if (!state.isLoading) {
      const isPublicRoute = PUBLIC_ROUTES.some((route) =>
        location.pathname.startsWith(route)
      );

      if (state.isAuthenticated && isPublicRoute) {
        // Redirect authenticated users away from public routes
        const from = (location.state as { from?: string })?.from || '/';
        navigate(from, { replace: true });
      }
    }
  }, [state.isAuthenticated, state.isLoading, location, navigate]);

  // Login handler
  const login = useCallback(
    async (email: string, password: string): Promise<LoginResponse> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await authService.login(email, password);
        setState({
          user: response.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });

        // Navigate to intended destination or dashboard
        const from = (location.state as { from?: string })?.from || '/';
        navigate(from, { replace: true });

        return response;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Login failed';
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
        }));
        throw error;
      }
    },
    [navigate, location]
  );

  // Register handler
  const register = useCallback(
    async (
      email: string,
      password: string,
      firstName: string,
      lastName: string,
      role?: UserRole
    ): Promise<void> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        await authService.register(email, password, firstName, lastName, role);
        setState((prev) => ({
          ...prev,
          isLoading: false,
        }));

        // Navigate to email verification notice or login
        navigate('/login', {
          state: {
            message: 'Registration successful! Please check your email to verify your account.',
          },
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Registration failed';
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
        }));
        throw error;
      }
    },
    [navigate]
  );

  // Logout handler
  const logout = useCallback(async (): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      await authService.logout();
    } finally {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      navigate('/login');
    }
  }, [navigate]);

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    if (authService.isAuthenticated()) {
      try {
        const user = await authService.getCurrentUser();
        setState((prev) => ({
          ...prev,
          user,
        }));
      } catch (error) {
        console.error('Failed to refresh user:', error);
      }
    }
  }, []);

  const value: AuthContextValue = {
    ...state,
    login,
    register,
    logout,
    clearError,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook to use auth context
export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }

  return context;
}

export default AuthContext;

