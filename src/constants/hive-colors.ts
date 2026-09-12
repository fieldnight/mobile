/**
 * 벌통 관련 화면(hive-control, hive-stats, hive-setting) 공통 색상
 * 모든 하이브 화면은 여기서 색상을 가져옵니다.
 */
export const C = {
  top: "#EA580C", // 상단 강조 (로고, 배지 등)
  primary: "#69b4d5", // 브랜드 오렌지 (CTA, 강조)
  primarySoft: "rgba(234, 88, 12, 0.08)", // 강조 소프트 배경
  recommendCtaBg: "#EAF6FB", // 수정벌 추천 CTA 배경
  recommendCtaBorder: "#BFE4F2", // 수정벌 추천 CTA 보더
  selected: "#EBF4FF", // 선택 상태 배경
  infoBg: "#E8F2FF", // 아이콘 / 보조 강조 배경
  shadow: "#000000", // 그림자 색상
  bg: "#F4F5F7", // 페이지 배경
  white: "#FFFFFF", // 카드 배경
  text: "#191F28", // 기본 텍스트
  textSx: "#414c52",
  textAlt: "#4B5563", // 대체 텍스트 (부제목, 설명 등)
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
  cardBorder: "rgba(200,210,220,0.35)", // IoT 카드 테두리 - 회색 반투명
  cardBorderDragging: "rgba(255,255,255,0.9)", // IoT 카드 드래그 중 테두리
  // 삼성 스마트싱스 스타일 개폐기(door-opener) 화면 전용 팔레트.
  // 다른 화면의 브랜드 컬러(C.primary, 하늘색)와 분리된 다크 네이비/슬레이트 톤입니다.
  gatePrimary: "#334155", // 개폐기 화면 강조색 (버튼/토글/아이콘배지/슬라이더) - 다크 슬레이트
  gatePrimarySoft: "rgba(51,65,85,0.08)", // 강조 소프트 배경
  stCardBg: "#F5F6F8", // 카드 배경 (화면 배경보다 살짝 짙은 톤)
  stIconBadgeOn: "#334155", // 아이콘 배지 - 켜짐/실행중 (gatePrimary와 동일)
  stIconBadgeOff: "#E4E7EC", // 아이콘 배지 - 꺼짐
  stIconOff: "#9AA3AF", // 꺼짐 배지 위 아이콘 색
} as const;

export type HiveColor = keyof typeof C;
