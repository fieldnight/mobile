import { Linking, Platform } from "react-native";

/**
 * Expo Go/일반 클라이언트에서는 앱이 Wi-Fi를 강제로 바꿀 수 없어서 시스템 설정까지만
 * 열어줍니다. 사용자가 기기의 설정 핫스팟을 선택한 뒤 앱으로 돌아오면 로컬 HTTP로
 * 연결 여부를 확인합니다. 벌통/개폐기 공통으로 쓰는 기기 비종속 유틸입니다.
 */
export async function openWifiSettings() {
  if (__DEV__) console.info("[Device WiFi] system Wi-Fi settings requested");

  if (Platform.OS === "android") {
    await Linking.sendIntent("android.settings.WIFI_SETTINGS");
    return;
  }

  if (Platform.OS === "ios") {
    const wifiSettingsUrl = "App-Prefs:root=WIFI";
    if (await Linking.canOpenURL(wifiSettingsUrl)) {
      await Linking.openURL(wifiSettingsUrl);
      return;
    }
  }

  await Linking.openSettings();
}
