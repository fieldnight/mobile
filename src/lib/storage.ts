import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_STORAGE_KEY = 'auth-storage';

interface AuthStorageState {
  user: unknown | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

/**
 * AsyncStorage에서 refresh token 읽기
 */
export async function getStoredRefreshToken(): Promise<string | null> {
  try {
    const authStorage = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      return parsed.state?.refreshToken || null;
    }
  } catch (e) {
    console.log('[Storage] refresh token 읽기 실패:', e);
  }
  return null;
}

/**
 * AsyncStorage에 토큰 저장
 */
export async function updateStoredTokens(
  accessToken: string,
  refreshToken: string | null
): Promise<void> {
  try {
    const authStorage = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      parsed.state.accessToken = accessToken;
      if (refreshToken) {
        parsed.state.refreshToken = refreshToken;
      }
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(parsed));
    }
  } catch (e) {
    console.log('[Storage] 토큰 저장 실패:', e);
  }
}

/**
 * 인증 정보 초기화 (로그아웃 처리)
 */
export async function clearAuthStorage(): Promise<void> {
  try {
    const authStorage = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      parsed.state.user = null;
      parsed.state.accessToken = null;
      parsed.state.refreshToken = null;
      parsed.state.isAuthenticated = false;
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(parsed));
    }
  } catch (e) {
    console.log('[Storage] 인증 정보 초기화 실패:', e);
  }
}
