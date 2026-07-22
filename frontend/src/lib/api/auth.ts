import { apiClient, mapApiError } from '@/lib/api-client';
import type { ApiResponse, AuthResponse, User } from '@/lib/types';

export async function login(
  email: string,
  password: string,
): Promise<ApiResponse<AuthResponse>> {
  try {
    const { data } = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', {
      email,
      password,
    });
    return data;
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function register(dto: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  marketingConsent?: boolean;
}): Promise<ApiResponse<AuthResponse>> {
  try {
    const { data } = await apiClient.post<ApiResponse<AuthResponse>>('/auth/register', dto);
    return data;
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function refreshToken(
  token: string,
): Promise<ApiResponse<AuthResponse>> {
  try {
    const { data } = await apiClient.post<ApiResponse<AuthResponse>>('/auth/refresh', {
      refreshToken: token,
    });
    return data;
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function logout(refreshToken: string): Promise<void> {
  try {
    await apiClient.post('/auth/logout', { refreshToken });
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function getProfile(): Promise<ApiResponse<User>> {
  try {
    const { data } = await apiClient.get<ApiResponse<User>>('/auth/me');
    return data;
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function forgotPassword(email: string): Promise<void> {
  try {
    await apiClient.post('/auth/forgot-password', { email });
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function resetPassword(token: string, password: string): Promise<void> {
  try {
    await apiClient.post('/auth/reset-password', { token, password });
  } catch (error) {
    throw mapApiError(error);
  }
}
