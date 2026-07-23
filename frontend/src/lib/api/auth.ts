import { apiClient, mapApiError } from "@/lib/api-client"
import type { ApiResponse, AuthResponse, RegistrationPendingResponse, User, VerifyRegistrationResponse } from "@/lib/types"

export class RegistrationVerificationRequiredError extends Error {
  constructor(readonly pendingRegistration: RegistrationPendingResponse) {
    super("Account verification is required before signing in.")
    this.name = "RegistrationVerificationRequiredError"
  }
}

export async function login(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
  try {
    const { data } = await apiClient.post<ApiResponse<AuthResponse>>("/auth/login", {
      email,
      password,
    })
    return data
  } catch (error) {
    const mapped = mapApiError(error)
    if (mapped.code === "ACCOUNT_VERIFICATION_REQUIRED" && mapped.pendingRegistration) {
      throw new RegistrationVerificationRequiredError(mapped.pendingRegistration)
    }
    throw mapped
  }
}

export async function register(dto: {
  email: string
  password: string
  fullName: string
  phone?: string
  marketingConsent?: boolean
}): Promise<ApiResponse<RegistrationPendingResponse>> {
  try {
    const { data } = await apiClient.post<ApiResponse<RegistrationPendingResponse>>("/auth/register", dto)
    return data
  } catch (error) {
    throw mapApiError(error)
  }
}

export async function verifyRegistration(verificationFlowId: string, otp: string): Promise<ApiResponse<VerifyRegistrationResponse>> {
  try {
    const { data } = await apiClient.post<ApiResponse<VerifyRegistrationResponse>>("/auth/registration/verify", { verificationFlowId, otp })
    return data
  } catch (error) {
    throw mapApiError(error)
  }
}

export async function resendRegistration(verificationFlowId: string): Promise<ApiResponse<{ resendAfterSeconds: number }>> {
  try {
    const { data } = await apiClient.post<ApiResponse<{ resendAfterSeconds: number }>>("/auth/registration/resend", { verificationFlowId })
    return data
  } catch (error) {
    throw mapApiError(error)
  }
}

export async function refreshToken(token: string): Promise<ApiResponse<AuthResponse>> {
  try {
    const { data } = await apiClient.post<ApiResponse<AuthResponse>>("/auth/refresh", {
      refreshToken: token,
    })
    return data
  } catch (error) {
    throw mapApiError(error)
  }
}

export async function logout(refreshToken: string): Promise<void> {
  try {
    await apiClient.post("/auth/logout", { refreshToken })
  } catch (error) {
    throw mapApiError(error)
  }
}

export async function getProfile(): Promise<ApiResponse<User>> {
  try {
    const { data } = await apiClient.get<ApiResponse<User>>("/auth/me")
    return data
  } catch (error) {
    throw mapApiError(error)
  }
}

export async function forgotPassword(email: string): Promise<void> {
  try {
    await apiClient.post("/auth/forgot-password", { email })
  } catch (error) {
    throw mapApiError(error)
  }
}

export async function resetPassword(token: string, password: string): Promise<void> {
  try {
    await apiClient.post("/auth/reset-password", { token, password })
  } catch (error) {
    throw mapApiError(error)
  }
}
