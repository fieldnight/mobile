import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/lib/api';
import { registerTokenCallbacks } from '@/lib/tokenManager';
import { queryClient } from '@/providers';
import type { User, LoginRequest, RegisterRequest, ApiResponse, SignInResponseData, OAuthSignInResponse } from '@/types';

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
            let accessTokenFromBody = data.data?.accessToken || null;

            const authHeader =
              response.headers['authorization'] ||
              response.headers['Authorization'] ||
              response.headers['AUTHORIZATION'];
            const headerToken = authHeader?.replace(/^Bearer\s+/i, '') || accessTokenFromBody;

            let refreshToken: string | null = data.data?.refreshToken || null;

            if (!refreshToken) {
              const setCookieHeader = response.headers['set-cookie'];
              if (setCookieHeader) {
                const cookieString = Array.isArray(setCookieHeader) ? setCookieHeader.join('; ') : setCookieHeader;
                const match = cookieString.match(/refreshToken=([^;]+)/);
                if (match) {
                  refreshToken = match[1];
                }
              }
            }

            if (!refreshToken) {
              refreshToken = response.headers['x-refresh-token'] || response.headers['refresh-token'] || null;
            }

            const accessToken = headerToken || null;

            // 로그인 성공 시 사용자 정보 및 토큰 설정
            const user: User = {
              id: '',
              username: credentials.username,
              email: '',
              fullName: data.data.name,
            };

            // API 인스턴스에 토큰 설정
            if (accessToken) {
              api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
            }

            set({ user, accessToken, refreshToken, isAuthenticated: true, isLoading: false });
          } else {
            throw new Error(data.message);
          }
        } catch (error: any) {
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
            const authHeader =
              response.headers['authorization'] ||
              response.headers['Authorization'];
            const accessToken = authHeader?.replace(/^Bearer\s+/i, '') || null;

            let refreshToken: string | null = null;
            const setCookieHeader = response.headers['set-cookie'];
            if (setCookieHeader) {
              const cookieString = Array.isArray(setCookieHeader) ? setCookieHeader.join('; ') : setCookieHeader;
              const match = cookieString.match(/refreshToken=([^;]+)/);
              if (match) refreshToken = match[1];
            }
            if (!refreshToken) {
              refreshToken = response.headers['x-refresh-token'] || response.headers['refresh-token'] || null;
            }

            if (accessToken) {
              api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
            }

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
          await api.post('/api/v1/auth/sign-out');
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          delete api.defaults.headers.common['Authorization'];
          queryClient.clear();
          set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
        }
      },

      withdraw: async () => {
        try {
          await api.delete('/api/v1/users/me');
        } finally {
          delete api.defaults.headers.common['Authorization'];
          queryClient.clear();
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
