import * as Application from "expo-application";
import * as Device from "expo-device";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";

import {
  deleteFcmToken,
  registerFcmToken,
} from "@/features/notification/api/fcmTokenApi";

const NOTIFICATION_CHANNEL_ID = "default";

let foregroundHandlerConfigured = false;
let registeredToken: string | null = null;
let syncPromise: Promise<void> | null = null;
let tokenRegistrationPromise: Promise<void> | null = null;
let tokenRegistrationKey: string | null = null;

function getRuntimeLabel() {
  return Constants.executionEnvironment ?? ExecutionEnvironment.Bare;
}

export function canUseNativePushNotifications() {
  return Platform.OS === "android" && getRuntimeLabel() !== ExecutionEnvironment.StoreClient;
}

function maskToken(token: string) {
  if (token.length <= 12) return token;
  return `${token.slice(0, 6)}...${token.slice(-4)}`;
}

async function getNotificationsModule() {
  return import("expo-notifications");
}

export async function configureForegroundNotifications() {
  if (!canUseNativePushNotifications()) {
    console.log("[FCM] Expo Go 또는 비지원 런타임이라 포그라운드 알림 설정을 건너뜀", {
      runtime: getRuntimeLabel(),
      platform: Platform.OS,
    });
    return;
  }

  if (foregroundHandlerConfigured) return;

  const Notifications = await getNotificationsModule();

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
    handleError: (notificationId, error) => {
      console.error("[FCM] 포그라운드 알림 처리 실패", {
        notificationId,
        error,
      });
    },
  });

  foregroundHandlerConfigured = true;
  console.log("[FCM] 포그라운드 알림 표시 설정 완료");
}

export async function getFcmDeviceInfo(): Promise<string> {
  const applicationId = Application.applicationId ?? "unknown-app";

  if (Platform.OS === "android") {
    return `android:${applicationId}:${Application.getAndroidId()}`;
  }

  if (Platform.OS === "ios") {
    const vendorId = await Application.getIosIdForVendorAsync();
    return `ios:${applicationId}:${vendorId ?? "unknown-device"}`;
  }

  return `${Platform.OS}:${applicationId}:unsupported`;
}

async function ensureNotificationPermission(): Promise<boolean> {
  const Notifications = await getNotificationsModule();
  const currentPermission = await Notifications.getPermissionsAsync();
  if (currentPermission.granted) return true;

  const requestedPermission = await Notifications.requestPermissionsAsync();
  if (!requestedPermission.granted) {
    console.warn("[FCM] 알림 권한이 허용되지 않아 토큰 등록을 건너뜀", {
      status: requestedPermission.status,
    });
    return false;
  }

  return true;
}

async function prepareAndroidNotificationChannel() {
  if (Platform.OS !== "android") return;

  const Notifications = await getNotificationsModule();

  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
    name: "기본 알림",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#F59E0B",
  });
}

async function registerToken(token: string) {
  if (registeredToken === token) {
    console.log("[FCM] 동일 토큰이 이미 등록되어 API 호출을 생략함", {
      token: maskToken(token),
    });
    return;
  }

  if (tokenRegistrationPromise && tokenRegistrationKey === token) {
    console.log("[FCM] 동일 토큰 등록이 이미 진행 중이라 기존 요청을 재사용함", {
      token: maskToken(token),
    });
    return tokenRegistrationPromise;
  }

  tokenRegistrationKey = token;
  tokenRegistrationPromise = (async () => {
    const deviceInfo = await getFcmDeviceInfo();
    await registerFcmToken({ token, deviceInfo });
    registeredToken = token;
  })().finally(() => {
    tokenRegistrationPromise = null;
    tokenRegistrationKey = null;
  });

  return tokenRegistrationPromise;
}

export async function registerCurrentDeviceFcmToken(): Promise<void> {
  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    if (!canUseNativePushNotifications()) {
      console.log("[FCM] Expo Go 또는 비지원 런타임이라 FCM 토큰 등록을 건너뜀", {
        runtime: getRuntimeLabel(),
        platform: Platform.OS,
      });
      return;
    }

    if (!Device.isDevice) {
      console.log("[FCM] 실제 기기가 아니어서 토큰 등록을 건너뜀");
      return;
    }

    await prepareAndroidNotificationChannel();

    const hasPermission = await ensureNotificationPermission();
    if (!hasPermission) return;

    const Notifications = await getNotificationsModule();
    const pushToken = await Notifications.getDevicePushTokenAsync();
    if (pushToken.type !== "android" || typeof pushToken.data !== "string") {
      console.warn("[FCM] Android FCM 토큰을 가져오지 못함", {
        tokenType: pushToken.type,
      });
      return;
    }

    console.log("[FCM] 기기 토큰 발급 성공", {
      token: maskToken(pushToken.data),
    });
    await registerToken(pushToken.data);
  })().finally(() => {
    syncPromise = null;
  });

  return syncPromise;
}

export async function registerRefreshedFcmToken(token: string): Promise<void> {
  if (!canUseNativePushNotifications()) return;

  console.log("[FCM] 기기 토큰 갱신 감지", {
    token: maskToken(token),
  });
  await registerToken(token);
}

export async function unregisterCurrentDeviceFcmToken(): Promise<void> {
  if (!canUseNativePushNotifications()) return;

  // 로그인 직후 등록 중 로그아웃해도 마지막 등록 요청 뒤에 삭제되도록 순서를 보장합니다.
  if (syncPromise) {
    await syncPromise.catch(() => undefined);
  }

  if (tokenRegistrationPromise) {
    await tokenRegistrationPromise.catch(() => undefined);
  }

  const deviceInfo = await getFcmDeviceInfo();
  try {
    await deleteFcmToken(deviceInfo);
  } finally {
    registeredToken = null;
  }
}

export function clearFcmRegistrationMemory() {
  registeredToken = null;
}

export async function subscribeToNativePushTokenChanges(
  onToken: (token: string) => void,
): Promise<() => void> {
  if (!canUseNativePushNotifications()) {
    return () => undefined;
  }

  const Notifications = await getNotificationsModule();
  const subscription = Notifications.addPushTokenListener((pushToken) => {
    if (pushToken.type !== "android" || typeof pushToken.data !== "string") {
      return;
    }

    onToken(pushToken.data);
  });

  return () => subscription.remove();
}
