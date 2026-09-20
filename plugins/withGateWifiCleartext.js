const { AndroidConfig, withAndroidManifest } = require("@expo/config-plugins");

/**
 * 개폐기 초기 Wi-Fi 프로비저닝(http://192.168.4.1)은 SoftAP 안에서만 오가는 평문
 * HTTP라 TLS를 쓸 수 없습니다. app.json의 android.usesCleartextTraffic 키를 Expo가
 * 자동으로 매니페스트에 반영해주지 않아 이 플러그인에서 직접 <application> 태그에
 * android:usesCleartextTraffic="true"를 넣어줍니다.
 */
function withGateWifiCleartext(config) {
  return withAndroidManifest(config, (config) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(
      config.modResults,
    );
    mainApplication.$["android:usesCleartextTraffic"] = "true";
    return config;
  });
}

module.exports = withGateWifiCleartext;
