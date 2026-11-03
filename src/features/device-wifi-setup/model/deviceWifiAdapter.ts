/**
 * 벌통/개폐기 Wi-Fi 온보딩이 공유하는 어댑터 계약입니다.
 * 기기별 model(hiveWifiProvisioning, gateWifiProvisioning)이 이 형태로
 * 함수를 채워 DeviceWifiSetupSheet에 주입하면, 화면·흐름은 한 곳에서만
 * 관리하고 기기별 차이(엔드포인트, 응답 포맷, 문구)만 갈아 끼울 수 있습니다.
 */
export type DeviceWifiSetupMode = "register" | "change";

export interface DeviceWifiStatus {
  /** 기기가 지금 설정 모드(SoftAP)로 응답하고 있는지 확인하는 용도. */
  connected: boolean;
  /** 확인 가능하면 기기의 MAC 주소(정규화된 형태). */
  macAddress?: string;
}

export interface DeviceWifiSetupCopy {
  sheetTitle: string;
  /** 기기 설정 핫스팟 이름(고정값이거나 MAC 기반). */
  setupSsid: string;
  setupPassword: string;
  /** "벌통" | "개폐기" 등 안내 문구에 쓰는 기기 이름. */
  deviceLabel: string;
  completeLabel: string;
}

export interface DeviceWifiAdapter {
  copy: DeviceWifiSetupCopy;
  /** 기기 설정 핫스팟(SoftAP)에 연결됐는지 로컬 HTTP로 확인합니다. */
  getStatus: () => Promise<DeviceWifiStatus>;
  /** 현장 공유기 SSID/비밀번호를 기기로 전달합니다. */
  sendCredentials: (ssid: string, password: string) => Promise<void>;
  normalizeDeviceId: (value: string) => string;
  isValidDeviceId: (value: string) => boolean;
}
