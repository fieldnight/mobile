import { openWifiSettings } from "@/features/hive-wifi";

export { openWifiSettings };

const GATE_SETUP_SSID = "BeeGate-Setup";
const GATE_SETUP_PASSWORD = "beehive123";
export const GATE_SETUP_URL = "http://192.168.4.1";
const REQUEST_TIMEOUT_MS = 8_000;
const DEVICE_ID_PATTERN = /^(?:[0-9A-F]{2}:){5}[0-9A-F]{2}$/;

export interface GateWifiStatus {
  mode: string;
  macAddress: string;
  stationConnected: boolean;
}

export class GateWifiProvisioningError extends Error {
  constructor(
    message: string,
    public readonly code = "GATE_WIFI_UNKNOWN",
  ) {
    super(message);
    this.name = "GateWifiProvisioningError";
  }
}

function logInfo(message: string, data?: Record<string, unknown>) {
  if (__DEV__) console.info(`[Gate WiFi] ${message}`, data ?? {});
}

async function requestGate(path: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${GATE_SETUP_URL}${path}`, {
      ...init,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Gate HTTP ${response.status}`);
    }
    return await response.json();
  } catch {
    throw new GateWifiProvisioningError(
      "개폐기와 통신하지 못했어요. 휴대폰이 개폐기 Wi-Fi(BeeGate-Setup)에 연결됐는지 확인해주세요.",
      "GATE_WIFI_HTTP_FAILED",
    );
  } finally {
    clearTimeout(timeout);
  }
}

export function normalizeGateDeviceId(value: string) {
  const withoutPrefix = value.trim().replace(/-/g, ":").toUpperCase();
  const compact = withoutPrefix.replace(/:/g, "");

  if (/^[0-9A-F]{12}$/.test(compact)) {
    return compact.match(/.{2}/g)?.join(":") ?? withoutPrefix;
  }

  return withoutPrefix;
}

export function isValidGateDeviceId(value: string) {
  return DEVICE_ID_PATTERN.test(normalizeGateDeviceId(value));
}

/** 개폐기 초기 설정 SoftAP의 SSID(고정값). 벌통과 달리 MAC 기반이 아닙니다. */
export function getGateSetupSsid() {
  return GATE_SETUP_SSID;
}

export function getGateSetupPassword() {
  return GATE_SETUP_PASSWORD;
}

/** 개폐기 설정 AP(BeeGate-Setup)에 연결됐는지 로컬 HTTP로 확인합니다. */
export async function getGateWifiStatus(): Promise<GateWifiStatus> {
  const response = await requestGate("/status", {
    headers: { Accept: "application/json" },
  });
  const status = response as GateWifiStatus;
  if (status.mode !== "ap_provisioning" || !isValidGateDeviceId(status.macAddress ?? "")) {
    throw new GateWifiProvisioningError("개폐기 정보를 확인하지 못했어요. AP 설정을 지원하는 최신 펌웨어인지 확인해주세요.");
  }
  status.macAddress = normalizeGateDeviceId(status.macAddress);
  logInfo("setup AP connection confirmed", { mode: status.mode });
  return status;
}

/**
 * 개폐기 설정 AP에 연결된 상태에서 현장 공유기의 Wi-Fi 자격증명을 개폐기(내장
 * 웹서버, 192.168.4.1)로 직접 전달합니다. 성공하면 개폐기가 곧바로 재부팅되어
 * 넘겨준 Wi-Fi로 접속을 시도합니다. 실패(정보가 틀림 등)하면 개폐기는 약 15초
 * 후 다시 BeeGate-Setup AP로 자동 복귀합니다.
 */
export function utf8ByteLength(value: string) {
  return [...value].reduce((size, char) => {
    const code = char.codePointAt(0)!;
    return size + (code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4);
  }, 0);
}

export async function sendGateRouterCredentials(ssid: string, password: string) {
  const normalizedSsid = ssid;
  if (!normalizedSsid || normalizedSsid.includes("\0") || utf8ByteLength(normalizedSsid) > 32) {
    throw new GateWifiProvisioningError(
      "현장 Wi-Fi 이름은 1~32바이트로 입력해주세요. 한글은 한 글자당 3바이트예요.",
      "GATE_WIFI_INVALID_ROUTER_SSID",
    );
  }
  const passwordBytes = utf8ByteLength(password);
  if (password.includes("\0") || passwordBytes > 63 || (passwordBytes > 0 && passwordBytes < 8)) {
    throw new GateWifiProvisioningError(
      "Wi-Fi 비밀번호는 8~63바이트로 입력해주세요. 비밀번호 없는 Wi-Fi는 비워두세요.",
      "GATE_WIFI_INVALID_ROUTER_PASSWORD",
    );
  }

  logInfo("router credentials delivery requested", { ssid: normalizedSsid });
  const response = await requestGate("/wifi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ssid: normalizedSsid, password }),
  });

  const result = response as { result: string; restarting?: boolean };
  if (result.result !== "ok") {
    throw new GateWifiProvisioningError(
      "개폐기가 Wi-Fi 정보를 저장하지 못했어요. 다시 시도해주세요.",
      "GATE_WIFI_SAVE_REJECTED",
    );
  }

  return result;
}
