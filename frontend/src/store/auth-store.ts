import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { User } from "@/lib/types"
import { apiClient, configureTokens } from "@/lib/api-client"
import {
  getProfile,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  verifyRegistration as apiVerifyRegistration,
  RegistrationVerificationRequiredError,
} from "@/lib/api/auth"
import { getQueryClient } from "@/providers/query-provider"
import type { RegistrationPendingResponse } from "@/lib/types"
import { useCartStore } from "@/store/cart-store"

export type AuthStatus = "hydrating" | "checking" | "registration_pending_verification" | "authenticated" | "unauthenticated" | "error"

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  authStatus: AuthStatus
  pendingRegistration: RegistrationPendingResponse | null
  setAuthStatus: (status: AuthStatus) => void
  login: (email: string, password: string) => Promise<void>
  register: (dto: { email: string; password: string; fullName: string; phone?: string; marketingConsent?: boolean }) => Promise<RegistrationPendingResponse>
  verifyRegistration: (otp: string) => Promise<void>
  logout: () => Promise<void>
  setUser: (user: User | null) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  loadFromStorage: () => void
  clearAuth: () => void
  fetchProfile: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      authStatus: "hydrating",
      pendingRegistration: null,

      setAuthStatus: (authStatus) => set({ authStatus }),

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const res = await apiLogin(email, password)
          const { user, accessToken, refreshToken } = res.data
          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
            authStatus: "authenticated",
          })
        } catch (error) {
          if (error instanceof RegistrationVerificationRequiredError) {
            set({
              user: null,
              accessToken: null,
              refreshToken: null,
              isAuthenticated: false,
              isLoading: false,
              authStatus: "registration_pending_verification",
              pendingRegistration: error.pendingRegistration,
            })
          } else {
            set({ isLoading: false })
          }
          throw error
        }
      },

      register: async (dto) => {
        set({ isLoading: true })
        try {
          const res = await apiRegister(dto)
          const pendingRegistration = res.data
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            authStatus: "registration_pending_verification",
            pendingRegistration,
          })
          return pendingRegistration
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      verifyRegistration: async (otp) => {
        const pending = get().pendingRegistration
        if (!pending) throw new Error("Registration verification session is unavailable.")
        set({ isLoading: true })
        try {
          const res = await apiVerifyRegistration(pending.verificationFlowId, otp)
          const { user, accessToken, refreshToken } = res.data
          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
            authStatus: "authenticated",
            pendingRegistration: null,
          })
          const profile = await getProfile()
          set({ user: profile.data })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: async () => {
        const { refreshToken } = get()
        try {
          if (refreshToken) {
            await apiLogout(refreshToken)
          }
        } catch {
        } finally {
          const queryClient = getQueryClient()
          if (queryClient) {
            queryClient.clear()
          }
          useCartStore.getState().clearLocalCart()

          const { clearAuth } = get()
          clearAuth()
        }
      },

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),

      loadFromStorage: () => {
        const state = get()
        if (state.accessToken) {
          apiClient.defaults.headers.common.Authorization = `Bearer ${state.accessToken}`
        }
      },

      clearAuth: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          authStatus: "unauthenticated",
          pendingRegistration: null,
        }),

      fetchProfile: async () => {
        set({ authStatus: "checking" })
        try {
          const res = await getProfile()
          set({
            user: res.data,
            isAuthenticated: true,
            authStatus: "authenticated",
          })
        } catch (err) {
          if (err && typeof err === "object" && "statusCode" in err && err.statusCode === 401) {
            useCartStore.getState().clearLocalCart()
            getQueryClient()?.clear()
            set({
              user: null,
              isAuthenticated: false,
              accessToken: null,
              refreshToken: null,
              authStatus: "unauthenticated",
            })
            return
          }
          set({ authStatus: "error" })
        }
      },
    }),
    {
      name: "opps-auth",
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        pendingRegistration: state.pendingRegistration,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (state.accessToken) {
            state.authStatus = "checking"
          } else if (state.pendingRegistration) {
            state.authStatus = "registration_pending_verification"
          } else {
            state.authStatus = "unauthenticated"
          }
        }
      },
    },
  ),
)

configureTokens({
  getAccessToken: () => useAuthStore.getState().accessToken,
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  setTokens: (access, refresh) => useAuthStore.getState().setTokens(access, refresh),
  clearTokens: () => {
    useAuthStore.getState().clearAuth()
    useCartStore.getState().clearLocalCart()
    getQueryClient()?.clear()
    if (typeof window !== "undefined") {
      localStorage.removeItem("opps-auth")
    }
  },
})
