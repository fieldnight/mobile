import { useEffect, useState } from "react";

import {
  clearFcmRegistrationMemory,
  configureForegroundNotifications,
  canUseNativePushNotifications,
  registerCurrentDeviceFcmToken,
  registerRefreshedFcmToken,
  subscribeToNativePushTokenChanges,
} from "@/features/notification/model/fcmTokenService";
import { useAuthStore } from "@/stores/useAuthStore";

export function FcmTokenSync() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [authHydrated, setAuthHydrated] = useState(
    useAuthStore.persist.hasHydrated(),
  );

  useEffect(() => {
    void configureForegroundNotifications();

    const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
      setAuthHydrated(true);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!authHydrated) return;

    if (!isAuthenticated || !accessToken) {
      clearFcmRegistrationMemory();
      return;
    }

    let active = true;
    let unsubscribePushTokens: (() => void) | null = null;

    registerCurrentDeviceFcmToken().catch((error) => {
      if (!active) return;
      console.error("[FCM] 로그인 사용자 토큰 동기화 실패", { error });
    });

    if (canUseNativePushNotifications()) {
      // FCM이 실행 중 토큰을 교체하면 로그인 상태에서 즉시 백엔드에 다시 등록합니다.
      void subscribeToNativePushTokenChanges((token) => {
        if (!active) return;

        registerRefreshedFcmToken(token).catch((error) => {
          if (!active) return;
          console.error("[FCM] 갱신 토큰 동기화 실패", { error });
        });
      }).then((cleanup) => {
        if (!active) {
          cleanup();
          return;
        }

        unsubscribePushTokens = cleanup;
      });
    }

    return () => {
      active = false;
      unsubscribePushTokens?.();
    };
  }, [accessToken, authHydrated, isAuthenticated]);

  return null;
}
