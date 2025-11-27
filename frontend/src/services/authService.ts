import { apiClient } from './api';
import type { User, UserRole } from '../types';

// Auth response types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export interface RegisterResponse {
  user: User;
  message: string;
}

export interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
}

// Auth request types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface VerifyEmailRequest {
  token: string;
}

// Token storage keys
const ACCESS_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'auth_user';

/**
 * Authentication service for handling all auth-related API calls
 */
export const authService = {
  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', {
      email,
      password,
    });

    // Store tokens and user
    this.setTokens(response.tokens);
    this.setUser(response.user);

    return response;
  },

  /**
   * Register a new user
   */
  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role?: UserRole
  ): Promise<RegisterResponse> {
    const response = await apiClient.post<RegisterResponse>('/auth/register', {
      email,
      password,
      firstName,
      lastName,
      role: role || 'user',
    });

    return response;
  },

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      const refreshToken = this.getRefreshToken();
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken });
      }
    } catch (error) {
      // Silently fail - we still want to clear local storage
      console.error('Logout API call failed:', error);
    } finally {
      this.clearAuth();
    }
  },

  /**
   * Refresh the access token using the refresh token
   */
  async refreshToken(): Promise<RefreshResponse | null> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      return null;
    }

    try {
      const response = await apiClient.post<RefreshResponse>(
        '/auth/refresh',
        { refreshToken }
      );

      // Update access token
      localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);

      return response;
    } catch (error) {
      // If refresh fails, clear auth state
      this.clearAuth();
      throw error;
    }
  },

  /**
   * Get the current authenticated user from the server
   */
  async getCurrentUser(): Promise<User | null> {
    const token = this.getAccessToken();

    if (!token) {
      return null;
    }

    try {
      const user = await apiClient.get<User>('/auth/me');
      this.setUser(user);
      return user;
    } catch (error) {
      // If getting user fails with 401, clear auth
      this.clearAuth();
      return null;
    }
  },

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/auth/verify-email', { token });
  },

  /**
   * Request password reset email
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/auth/forgot-password', {
      email,
    });
  },

  /**
   * Reset password with token
   */
  async resetPassword(
    token: string,
    password: string
  ): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/auth/reset-password', {
      token,
      password,
    });
  },

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/auth/resend-verification', {
      email,
    });
  },

  // Token management helpers
  setTokens(tokens: AuthTokens): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  },

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  getStoredUser(): User | null {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  clearAuth(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  },
};

export default authService;

