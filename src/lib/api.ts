import axios from 'axios';
import Constants from 'expo-constants';
import {
  updateStoredTokens,
  clearAuthStorage,
} from './storage';
import { getRefreshToken, notifyTokensUpdated, notifyAuthCleared } from './tokenManager';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://webeelab.site';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor - 요청 로깅
api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

// Response interceptor - 에러 처리
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // reissue 요청 자체가 실패하면 무한 루프 방지
    const isReissueRequest = originalRequest.url?.includes('/auth/reissue');
    if (isReissueRequest) {
      await clearAuthStorage();
      delete api.defaults.headers.common['Authorization'];
      notifyAuthCleared();
      return Promise.reject(error);
    }

    // 401 에러이고 재시도하지 않은 경우 토큰 갱신 시도
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Zustand 메모리에서 refresh token 가져오기
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          await clearAuthStorage();
          delete api.defaults.headers.common['Authorization'];
          notifyAuthCleared();
          return Promise.reject(error);
        }

        // fetch를 사용하여 쿠키와 함께 reissue 요청
        const refreshResponse = await fetch(`${API_URL}/api/v1/auth/reissue`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `refreshToken=${refreshToken}`,
          },
          credentials: 'include',
        });

        const refreshData = await refreshResponse.json();

        if (!refreshResponse.ok) {
          throw new Error(`Reissue failed: ${refreshResponse.status}`);
        }

        // 새 access token 추출 (fetch 응답에서)
        const authHeader = refreshResponse.headers.get('authorization') ||
                          refreshResponse.headers.get('Authorization');
        const newAccessToken = authHeader?.replace(/^Bearer\s+/i, '');

        // 새 refresh token 추출 (Set-Cookie에서)
        const setCookieHeader = refreshResponse.headers.get('set-cookie');
        let newRefreshToken: string | null = null;
        if (setCookieHeader) {
          const match = setCookieHeader.match(/refreshToken=([^;]+)/);
          if (match) {
            newRefreshToken = match[1];
          }
        }

        if (newAccessToken) {
          // 토큰 업데이트
          api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

          // AsyncStorage에 저장
          await updateStoredTokens(newAccessToken, newRefreshToken);

          // Zustand 스토어 동기화
          notifyTokensUpdated(newAccessToken, newRefreshToken);

          return api(originalRequest);
        }
      } catch (refreshError) {
        await clearAuthStorage();
        delete api.defaults.headers.common['Authorization'];
        notifyAuthCleared();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
