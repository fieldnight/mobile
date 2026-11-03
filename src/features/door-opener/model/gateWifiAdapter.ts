/**
 * 개폐기용 DeviceWifiAdapter 구현.
 * 실제 통신은 gateWifiProvisioning.ts(개폐기 SoftAP HTTP)를 그대로 사용하고,
 * 여기서는 공용 DeviceWifiSetupSheet가 기대하는 형태로만 감쌉니다.
 */
import type { DeviceWifiAdapter, DeviceWifiSetupMode } from "@/features/device-wifi-setup";
import {
  getGateSetupPassword,
  getGateSetupSsid,
  getGateWifiStatus,
  isValidGateDeviceId,
  normalizeGateDeviceId,
  sendGateRouterCredentials,
} from "./gateWifiProvisioning";

export function createGateWifiAdapter(mode: DeviceWifiSetupMode): DeviceWifiAdapter {
  return {
    copy: {
      sheetTitle: mode === "change" ? "연결 Wi-Fi 변경" : "개폐기 Wi-Fi 연결",
      setupSsid: getGateSetupSsid(),
      setupPassword: getGateSetupPassword(),
      deviceLabel: "개폐기",
      completeLabel: mode === "change" ? "Wi-Fi 변경 저장" : "개폐기 등록으로 돌아가기",
    },
    getStatus: async () => {
      const status = await getGateWifiStatus();
      return { connected: true, macAddress: status.macAddress };
    },
    sendCredentials: async (ssid, password) => {
      await sendGateRouterCredentials(ssid, password);
    },
    normalizeDeviceId: normalizeGateDeviceId,
    isValidDeviceId: isValidGateDeviceId,
  };
}
