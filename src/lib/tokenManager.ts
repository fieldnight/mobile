// 토큰 업데이트 콜백 (useAuthStore에서 등록)
let onTokensUpdated: ((accessToken: string, refreshToken: string | null) => void) | null = null;
let onAuthCleared: (() => void) | null = null;
let getRefreshTokenFn: (() => string | null) | null = null;

export function registerTokenCallbacks(
  onUpdate: (accessToken: string, refreshToken: string | null) => void,
  onClear: () => void,
  getRefreshToken: () => string | null
) {
  onTokensUpdated = onUpdate;
  onAuthCleared = onClear;
  getRefreshTokenFn = getRefreshToken;
}

export function getRefreshToken(): string | null {
  return getRefreshTokenFn ? getRefreshTokenFn() : null;
}

export function notifyTokensUpdated(accessToken: string, refreshToken: string | null) {
  if (onTokensUpdated) {
    onTokensUpdated(accessToken, refreshToken);
  }
}

export function notifyAuthCleared() {
  if (onAuthCleared) {
    onAuthCleared();
  }
}
