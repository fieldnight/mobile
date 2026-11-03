/**
 * 벌통용 DeviceWifiAdapter 구현.
 * 기존에는 펌웨어 웹 설정 페이지(브라우저)로 이동시켰지만, 개폐기와 동일하게
 * 앱이 직접 /api/wifi로 전달하는 방식으로 통일해 브라우저 왕복을 없앱니다.
 * 벌통 SoftAP 이름 자체에 MAC이 포함돼 있어(Hive-AA:BB:CC:DD:EE:FF),
 * /api/status의 setupSsid에서 실제 기기 주소를 확인합니다.
 */
import type { DeviceWifiAdapter, DeviceWifiSetupMode } from "@/features/device-wifi-setup";
import {
  getHiveSetupPassword,
  getHiveSetupSsid,
  getHiveWifiStatus,
  isValidHiveDeviceId,
  normalizeHiveDeviceId,
  sendRouterCredentials,
} from "./hiveWifiProvisioning";

export function createHiveWifiAdapter(
  mode: DeviceWifiSetupMode,
  deviceId: string,
): DeviceWifiAdapter {
  const normalizedDeviceId = normalizeHiveDeviceId(deviceId);
  const setupSsid = isValidHiveDeviceId(normalizedDeviceId)
    ? getHiveSetupSsid(normalizedDeviceId)
    : "Hive-AA:BB:CC:DD:EE:FF";

  return {
    copy: {
      sheetTitle: mode === "change" ? "연결 Wi-Fi 변경" : "벌통 Wi-Fi 연결",
      setupSsid,
      setupPassword: getHiveSetupPassword(),
      deviceLabel: "벌통",
      completeLabel: mode === "change" ? "Wi-Fi 변경 저장" : "벌통 등록으로 돌아가기",
    },
    getStatus: async () => {
      const status = await getHiveWifiStatus();
      const macAddress = normalizeHiveDeviceId(status.setupSsid);
      if (!isValidHiveDeviceId(macAddress)) {
        throw new Error("연결된 벌통의 Wi-Fi 이름에서 기기 주소를 확인하지 못했어요.");
      }
      if (isValidHiveDeviceId(normalizedDeviceId) && macAddress !== normalizedDeviceId) {
        throw new Error("입력한 벌통 번호와 현재 연결된 벌통 Wi-Fi가 달라요.");
      }
      // 펌웨어의 connected는 현장 공유기(STA) 상태입니다. AP 응답 자체가 연결 증거입니다.
      return { connected: true, macAddress };
    },
    sendCredentials: async (ssid, password) => {
      await sendRouterCredentials(ssid, password);
    },
    normalizeDeviceId: normalizeHiveDeviceId,
    isValidDeviceId: isValidHiveDeviceId,
  };
}
