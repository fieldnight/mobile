import { useEffect, useState } from "react";
import * as Notifications from "expo-notifications";

import {
  clearFcmRegistrationMemory,
  configureForegroundNotifications,
  registerCurrentDeviceFcmToken,
  registerRefreshedFcmToken,
} from "@/features/notification/model/fcmTokenService";
import { useAuthStore } from "@/stores/useAuthStore";

export function FcmTokenSync() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [authHydrated, setAuthHydrated] = useState(
    useAuthStore.persist.hasHydrated(),
  );

  useEffect(() => {
    configureForegroundNotifications();

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

    registerCurrentDeviceFcmToken().catch((error) => {
      if (!active) return;
      console.error("[FCM] 로그인 사용자 토큰 동기화 실패", { error });
    });

    // FCM이 실행 중 토큰을 교체하면 로그인 상태에서 즉시 백엔드에 다시 등록합니다.
    const tokenSubscription = Notifications.addPushTokenListener((pushToken) => {
      if (
        !active ||
        pushToken.type !== "android" ||
        typeof pushToken.data !== "string"
      ) {
        return;
      }

      registerRefreshedFcmToken(pushToken.data).catch((error) => {
        console.error("[FCM] 갱신 토큰 동기화 실패", { error });
      });
    });

    return () => {
      active = false;
      tokenSubscription.remove();
    };
  }, [accessToken, authHydrated, isAuthenticated]);

  return null;
}
