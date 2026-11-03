/**
 * 앱 공통 색상
 * - 벌통 조종 화면(features/hive-home의 T 토큰)과 같은 톤입니다: 회색 캔버스 위 흰 면, 남색 강조.
 * - 색은 상태(성공·경고·오류)를 알릴 때만 쓰고, 강조는 남색 한 가지로 통일합니다.
 */
export const C = {
  top: "#EA580C", // 상단 강조 (로고, 배지 등)
  primary: "#191F28", // 기본 강조(CTA 버튼·선택 상태·링크). 흰 글자 대비 약 16:1
  primarySoft: "rgba(25,31,40,0.06)", // 강조 소프트 배경
  recommendCtaBg: "#EAF6FB", // 수정벌 추천 CTA 배경
  recommendCtaBorder: "#BFE4F2", // 수정벌 추천 CTA 보더
  selected: "#EEF0F3", // 선택 상태 배경
  infoBg: "#F5F6F8", // 아이콘 / 안내 상자 배경
  shadow: "#000000", // 그림자 색상
  bg: "#EEF0F3", // 페이지 배경(회색 캔버스)
  white: "#FFFFFF", // 카드 배경
  text: "#191F28", // 기본 텍스트
  textSx: "#414c52",
  textAlt: "#4E5968", // 대체 텍스트 (부제목, 설명 등)
  sec: "#8B95A1", // 보조 텍스트
  sky: "#9cdcff", // 하늘색 (슬라이더 화살표)
  ter: "#B0B8C1", // 3차 텍스트 (날짜, 단위 등)
  tabInactive: "#6B7684", // 상단 탭바 비선택 글자 (밝은 배경에서도 또렷이 보이는 톤)
  border: "#E5E8EB", // 구분선 / 보더
  bgAlt: "#F5F6F8", // 표·입력 묶음 배경(리모컨 버튼 면과 같은 톤)
  sectionBorder: "#D9E2E8", // 섹션 구분선
  chartTemp: "#ed7739", // 온도 차트
  chartHumidity: "#2563EB", // 습도 차트
  buttonActiveBg: "#191F28",
  buttonActiveText: "#FFFFFF",
  buttonInactiveBg: "#FFFFFF",
  buttonInactiveText: "#8B95A1",
  hive1: "#ed7739",
  hive2: "#FBBF24",
  hive3: "#34D399",
  hive4: "#3B82F6",
  success: "#15803D", // 온라인 상태 등 긍정
  warning: "#D97706", // 경고
  error: "#DC2626", // 에러 / 오프라인
  cardBorder: "rgba(200,210,220,0.35)", // IoT 카드 테두리 - 회색 반투명
  cardBorderDragging: "rgba(255,255,255,0.9)", // IoT 카드 드래그 중 테두리
  // 개폐기(door-opener) 화면 팔레트. 앱 공통 강조(primary)와 같은 남색으로 맞췄습니다.
  gatePrimary: "#191F28", // 개폐기 화면 강조색 (버튼/토글/아이콘배지/슬라이더)
  gatePrimarySoft: "rgba(25,31,40,0.06)", // 강조 소프트 배경
  stCardBg: "#F5F6F8", // 카드 배경 (화면 배경보다 살짝 짙은 톤)
  stIconBadgeOn: "#191F28", // 아이콘 배지 - 켜짐/실행중 (gatePrimary와 동일)
  stIconBadgeOff: "#E4E7EC", // 아이콘 배지 - 꺼짐
  stIconOff: "#9AA3AF", // 꺼짐 배지 위 아이콘 색
} as const;

export type HiveColor = keyof typeof C;
