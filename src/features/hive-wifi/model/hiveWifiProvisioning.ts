export { openWifiSettings } from "@/features/device-wifi-setup/model/systemWifiSettings";

export interface HiveWifiStatus {
  stationSsid: string;
  setupSsid: string;
  connected: boolean;
}

const SETUP_AP_PASSWORD =
  process.env.EXPO_PUBLIC_HIVE_SETUP_AP_PASSWORD?.trim() || "hive-setup";
export const HIVE_SETUP_URL = "http://192.168.4.1";
const REQUEST_TIMEOUT_MS = 8_000;
const DEVICE_ID_PATTERN = /^(?:[0-9A-F]{2}:){5}[0-9A-F]{2}$/;

export class HiveWifiProvisioningError extends Error {
  constructor(
    message: string,
    public readonly code = "HIVE_WIFI_UNKNOWN",
  ) {
    super(message);
    this.name = "HiveWifiProvisioningError";
  }
}

function logInfo(message: string, data?: Record<string, unknown>) {
  if (__DEV__) console.info(`[Hive WiFi] ${message}`, data ?? {});
}

async function requestHive(
  path: string,
  init?: RequestInit,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${HIVE_SETUP_URL}${path}`, {
      ...init,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Smart Hive HTTP ${response.status}`);
    }
    return response;
  } catch (error) {
    throw new HiveWifiProvisioningError(
      "벌통과 통신하지 못했어요. 휴대폰이 벌통 Wi-Fi에 연결됐는지 확인해주세요.",
      "HIVE_WIFI_HTTP_FAILED",
    );
  } finally {
    clearTimeout(timeout);
  }
}

export function normalizeHiveDeviceId(value: string) {
  const withoutPrefix = value
    .trim()
    .replace(/^Hive-/i, "")
    .replace(/-/g, ":")
    .toUpperCase();
  const compact = withoutPrefix.replace(/:/g, "");

  if (/^[0-9A-F]{12}$/.test(compact)) {
    return compact.match(/.{2}/g)?.join(":") ?? withoutPrefix;
  }

  return withoutPrefix;
}

export function isValidHiveDeviceId(value: string) {
  return DEVICE_ID_PATTERN.test(normalizeHiveDeviceId(value));
}

export function getHiveSetupSsid(deviceId: string) {
  return `Hive-${normalizeHiveDeviceId(deviceId)}`;
}

export function getHiveSetupPassword() {
  return SETUP_AP_PASSWORD;
}

export async function getHiveWifiStatus(): Promise<HiveWifiStatus> {
  const response = await requestHive("/api/status", {
    headers: { Accept: "application/json" },
  });
  const status = (await response.json()) as HiveWifiStatus;
  logInfo("setup AP connection confirmed", { setupSsid: status.setupSsid });
  return status;
}

export async function sendRouterCredentials(ssid: string, password: string) {
  const normalizedSsid = ssid.trim();
  if (!normalizedSsid || normalizedSsid.length > 32) {
    throw new HiveWifiProvisioningError(
      "현장 Wi-Fi 이름은 1~32자로 입력해주세요.",
      "HIVE_WIFI_INVALID_ROUTER_SSID",
    );
  }
  if (password.length > 63 || (password.length > 0 && password.length < 8)) {
    throw new HiveWifiProvisioningError(
      "Wi-Fi 비밀번호는 8~63자로 입력해주세요.",
      "HIVE_WIFI_INVALID_ROUTER_PASSWORD",
    );
  }

  logInfo("router credentials delivery requested", { ssid: normalizedSsid });
  const response = await requestHive("/api/wifi", {
    method: "POST",
    // text/plain은 Expo Web에서도 CORS preflight 없이 ESP32에 전달할 수 있습니다.
    headers: { "Content-Type": "text/plain; charset=utf-8" },
    body: JSON.stringify({ ssid: normalizedSsid, password }),
  });

  return {
    accepted: true,
    message: await response.text(),
  };
}
