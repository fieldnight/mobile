/**
 * 현장 Wi-Fi 이름(SSID)에서 5GHz 전용 네트워크로 보이는지 추정합니다.
 * 휴대폰 OS가 앱에 연결된 Wi-Fi의 실제 주파수를 넘겨주지 않아(NetInfo 등 미설치),
 * "5G"/"5GHz" 같은 흔한 명명 규칙만으로 판단하는 휴리스틱입니다. 오탐이 있을 수
 * 있어 입력을 막지 않고 경고만 보여주며, 사용자가 "이 Wi-Fi는 2.4GHz예요"로
 * 직접 무시할 수 있게 합니다.
 */
const FIVE_GHZ_HINT_PATTERN = /(^|[^a-z0-9])5\s*g(hz)?([^a-z0-9]|$)/i;

export function looksLikeFiveGhzSsid(ssid: string) {
  return FIVE_GHZ_HINT_PATTERN.test(ssid.trim());
}
