import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/lib/api';
import { registerTokenCallbacks } from '@/lib/tokenManager';
import { queryClient } from '@/providers';
import { unregisterCurrentDeviceFcmToken } from '@/features/notification/model/fcmTokenService';
import { useHiveStore } from '@/stores/useHiveStore';
import type { User, LoginRequest, RegisterRequest, ApiResponse, SignInResponseData, OAuthSignInResponse } from '@/types';

function getResponseHeader(headers: unknown, name: string): string | null {
  if (!headers || typeof headers !== 'object') return null;

  const getterValue = (headers as { get?: (headerName: string) => unknown }).get?.(name);
  if (typeof getterValue === 'string') return getterValue;

  const normalizedName = name.toLowerCase();
  const entry = Object.entries(headers as Record<string, unknown>).find(
    ([key]) => key.toLowerCase() === normalizedName,
  );
  const value = entry?.[1];

  if (Array.isArray(value)) return value.join('; ');
  return typeof value === 'string' ? value : null;
}

function getBearerToken(headers: unknown): string | null {
  return getResponseHeader(headers, 'authorization')?.replace(/^Bearer\s+/i, '') || null;
}

function getRefreshTokenFromHeaders(headers: unknown): string | null {
  const setCookieHeader = getResponseHeader(headers, 'set-cookie');
  if (setCookieHeader) {
    const match = setCookieHeader.match(/refreshToken=([^;]+)/);
    if (match) return match[1];
  }

  return (
    getResponseHeader(headers, 'x-refresh-token') ||
    getResponseHeader(headers, 'refresh-token')
  );
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  socialLogin: (platform: 'KAKAO' | 'NAVER', code: string) => Promise<OAuthSignInResponse>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  withdraw: () => Promise<void>;
  setUser: (user: User | null) => void;
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  setTokens: (accessToken: string, refreshToken: string | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      isAuthenticated: false,

      login: async (credentials) => {
        set({ isLoading: true });
        try {
          const response = await api.post<ApiResponse<SignInResponseData>>(
            '/api/v1/auth/sign-in',
            credentials
          );

          const { data } = response;

          if (data.code === '200' || data.code === 'OK') {
            const accessToken =
              getBearerToken(response.headers) || data.data?.accessToken || null;
            const refreshToken =
              data.data?.refreshToken ||
              getRefreshTokenFromHeaders(response.headers) ||
              null;

            if (!accessToken) {
              throw new Error('로그인 토큰을 받지 못했습니다. 서버 응답 헤더 설정을 확인해 주세요.');
            }

            // 로그인 성공 시 사용자 정보 및 토큰 설정
            const user: User = {
              id: '',
              username: credentials.username,
              email: '',
              fullName: data.data.name,
            };

            // API 인스턴스에 토큰 설정
            api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

            set({ user, accessToken, refreshToken, isAuthenticated: true, isLoading: false });
          } else {
            throw new Error(data.message);
          }
        } catch (error: any) {
          console.error('[Auth] 로그인 실패', {
            message: error?.message,
            status: error?.response?.status,
            data: error?.response?.data,
            error,
          });
          set({ isLoading: false });
          throw error;
        }
      },

      socialLogin: async (platform, code) => {
        set({ isLoading: true });
        try {
          const response = await api.get<ApiResponse<OAuthSignInResponse>>(
            `/api/v1/oauth/sign-in/${platform}`,
            { params: { code } }
          );

          const { data } = response;

          if (data.code === '200' || data.code === 'OK') {
            const accessToken = getBearerToken(response.headers);
            const refreshToken = getRefreshTokenFromHeaders(response.headers);

            if (!accessToken) {
              throw new Error('로그인 토큰을 받지 못했습니다. 서버 응답 헤더 설정을 확인해 주세요.');
            }

            api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

            const user: User = {
              id: '',
              username: '',
              email: '',
              fullName: data.data.name,
            };

            set({ user, accessToken, refreshToken, isAuthenticated: true, isLoading: false });

            return data.data;
          } else {
            throw new Error(data.message);
          }
        } catch (error: any) {
          console.error('[Auth] 소셜 로그인 실패', {
            platform,
            message: error?.message,
            status: error?.response?.status,
            data: error?.response?.data,
            error,
          });
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (registerData) => {
        set({ isLoading: true });
        try {
          const response = await api.post<ApiResponse<null>>(
            '/api/v1/auth/sign-up',
            registerData
          );

          const { data } = response;

          if (data.code === '200' || data.code === '201' || data.code === 'OK' || data.code === 'CREATED') {
            // 회원가입 성공 - 자동 로그인은 하지 않고 로그인 페이지로 이동하도록
            set({ isLoading: false });
          } else {
            throw new Error(data.message);
          }
        } catch (error: any) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          // 인증 헤더가 살아 있을 때 현재 기기의 FCM 등록부터 해제합니다.
          try {
            await unregisterCurrentDeviceFcmToken();
          } catch (error) {
            // FCM 해제 실패가 사용자의 로그아웃을 막아서는 안 됩니다.
            console.error('[Auth] 로그아웃 전 FCM 토큰 삭제 실패', { error });
          }

          await api.post('/api/v1/auth/sign-out');
        } catch (error) {
          console.error('[Auth] 로그아웃 API 실패', { error });
        } finally {
          delete api.defaults.headers.common['Authorization'];
          queryClient.clear();
          useHiveStore.getState().setHives([]);
          set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
        }
      },

      withdraw: async () => {
        try {
          await api.delete('/api/v1/users/me');
        } finally {
          delete api.defaults.headers.common['Authorization'];
          queryClient.clear();
          useHiveStore.getState().setHives([]);
          set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
        }
      },

      setUser: (user) => {
        set({ user, isAuthenticated: !!user });
      },

      getAccessToken: () => {
        return get().accessToken;
      },

      getRefreshToken: () => {
        return get().refreshToken;
      },

      setTokens: (accessToken, refreshToken) => {
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        set({ accessToken, refreshToken: refreshToken ?? get().refreshToken });
      },

      clearAuth: () => {
        delete api.defaults.headers.common['Authorization'];
        queryClient.clear();
        useHiveStore.getState().setHives([]);
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) {
          api.defaults.headers.common['Authorization'] = `Bearer ${state.accessToken}`;
        }
      },
    }
  )
);

// API 인터셉터에서 토큰 변경 시 스토어 동기화
registerTokenCallbacks(
  // 토큰 업데이트 콜백
  (accessToken, refreshToken) => {
    useAuthStore.setState({
      accessToken,
      refreshToken: refreshToken ?? useAuthStore.getState().refreshToken,
    });
  },
  () => {
    queryClient.clear();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },
  // refreshToken 조회 콜백 (Zustand 메모리에서 직접 읽기)
  () => useAuthStore.getState().refreshToken
);
