import apiClient from './client';
import type { AuthResponse, LoginCredentials, RegisterCredentials, ApiResponse, User } from '@/types';

export const authApi = {
  // Register new user
  register: (credentials: RegisterCredentials) =>
    apiClient.post<ApiResponse<AuthResponse>>('/auth/register', credentials),

  // Login
  login: (credentials: LoginCredentials) =>
    apiClient.post<ApiResponse<AuthResponse>>('/auth/login', credentials),

  // Logout
  logout: () =>
    apiClient.post<ApiResponse<void>>('/auth/logout'),

  // Refresh token
  refresh: (refreshToken: string) =>
    apiClient.post<ApiResponse<AuthResponse>>('/auth/refresh', { refreshToken }),

  // Get current user
  me: () =>
    apiClient.get<ApiResponse<User>>('/auth/me'),
};
