/**
 * 벌통 관련 화면(hive-control, hive-stats, hive-setting) 공통 색상
 * 모든 하이브 화면은 여기서 색상을 가져옵니다.
 */
export const C = {
  primary: "#ed7739", // 브랜드 오렌지 (CTA, 강조)
  primarySoft: "rgba(234, 88, 12, 0.08)", // 강조 소프트 배경
  selected: "#EBF4FF", // 선택 상태 배경
  infoBg: "#E8F2FF", // 아이콘 / 보조 강조 배경
  shadow: "#000000", // 그림자 색상
  bg: "#F4F5F7", // 페이지 배경
  white: "#FFFFFF", // 카드 배경
  text: "#191F28", // 기본 텍스트
  sec: "#8B95A1", // 보조 텍스트
  sky: "#9cdcff", // 하늘색 (슬라이더 화살표)
  ter: "#B0B8C1", // 3차 텍스트 (날짜, 단위 등)
  border: "#E5E8EB", // 구분선 / 보더
  bgAlt: "#F8FAFC", // 표 대체 배경
  sectionBorder: "#D9E2E8", // 섹션 구분선
  chartTemp: "#ed7739", // 온도 차트
  chartHumidity: "#2563EB", // 습도 차트
  buttonActiveBg: "#ed7739",
  buttonActiveText: "#FFFFFF",
  buttonInactiveBg: "#FFFFFF",
  buttonInactiveText: "#8B95A1",
  hive1: "#ed7739",
  hive2: "#FBBF24",
  hive3: "#34D399",
  hive4: "#3B82F6",
  success: "#059669", // 온라인 상태 등 긍정
  warning: "#D97706", // 경고
  error: "#DC2626", // 에러 / 오프라인
} as const;

export type HiveColor = keyof typeof C;
