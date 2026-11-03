/**
 * 벌통 홈(리모컨) 화면 전용 토큰
 * - 회색 캔버스 위에 흰 패널을 올리는 가전 리모컨 톤입니다.
 * - 색은 상태를 알릴 때만 씁니다. 장식용 색은 두지 않습니다.
 */
export const T = {
  canvas: "#EEF0F3",
  panel: "#FFFFFF",
  key: "#F5F6F8", // 리모컨 버튼 면
  keyPressed: "#E8EBEF",
  ink: "#191F28",
  inkSoft: "#4E5968",
  muted: "#8B95A1",
  line: "#E5E8EB",
  brand: "#69B4D5", // 앱 브랜드 하늘색, 조작 강조에만 사용
  brandSoft: "#EAF6FB",
  good: "#15803D",
  goodSoft: "#E9F5EC",
  hot: "#C2410C",
  hotSoft: "#FDF0E8",
  cold: "#2563EB",
  coldSoft: "#EAF1FE",
  off: "#9AA3AF",
  offSoft: "#F1F3F5",
} as const;

export const R = {
  panel: 24,
  key: 18,
  chip: 999,
} as const;

/** 수정벌 권장 내부 온도 구간 */
export const COMFORT_MIN = 24;
export const COMFORT_MAX = 27;
