import * as Application from "expo-application";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import {
  deleteFcmToken,
  registerFcmToken,
} from "@/features/notification/api/fcmTokenApi";

const NOTIFICATION_CHANNEL_ID = "default";

let foregroundHandlerConfigured = false;
let registeredToken: string | null = null;
let registrationPromise: Promise<void> | null = null;

function maskToken(token: string) {
  if (token.length <= 12) return token;
  return `${token.slice(0, 6)}...${token.slice(-4)}`;
}

export function configureForegroundNotifications() {
  if (foregroundHandlerConfigured) return;

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

  const deviceInfo = await getFcmDeviceInfo();
  await registerFcmToken({ token, deviceInfo });
  registeredToken = token;
}

export async function registerCurrentDeviceFcmToken(): Promise<void> {
  if (registrationPromise) return registrationPromise;

  registrationPromise = (async () => {
    if (Platform.OS !== "android") {
      // getDevicePushTokenAsync는 iOS에서 APNs 토큰을 반환하므로 FCM API에는 등록하지 않습니다.
      console.log("[FCM] Android가 아니어서 FCM 토큰 등록을 건너뜀", {
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
    registrationPromise = null;
  });

  return registrationPromise;
}

export async function registerRefreshedFcmToken(token: string): Promise<void> {
  if (Platform.OS !== "android") return;

  console.log("[FCM] 기기 토큰 갱신 감지", {
    token: maskToken(token),
  });
  await registerToken(token);
}

export async function unregisterCurrentDeviceFcmToken(): Promise<void> {
  if (Platform.OS !== "android") return;

  // 로그인 직후 등록 중 로그아웃해도 마지막 등록 요청 뒤에 삭제되도록 순서를 보장합니다.
  if (registrationPromise) {
    await registrationPromise.catch(() => undefined);
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
