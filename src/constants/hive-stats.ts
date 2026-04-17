/**
 * 벌통 관련 기능 통합 상수
 * - Colors         : 컬러 팔레트
 * - Spacing        : 여백 단위 (xs~xl)
 * - KMA_REGIONS    : 기상청 지점 코드·이름 목록
 * - HIVES          : 벌통 목록 (id, name, status)
 * - WEATHER_REGION_KEY / KMA_API_KEY : AsyncStorage 키 및 API 인증키
 */

export const Colors = {
  primary: "#3182F6",
  background: "#F4F5F7",
  white: "#FFFFFF",
  text: "#191F28",
  textSecondary: "#8B95A1",
  textTertiary: "#B0B8C1",
  border: "#E5E8EB",
  success: "#00C853",
  warning: "#FF9100",
  error: "#F44336",
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const WEATHER_REGION_KEY = "webee_weather_region";
export const KMA_API_KEY = process.env.EXPO_PUBLIC_KMA_API_KEY!;
export const PERIODS = ["일간", "주간", "월간"] as const; //날씨 확인 

export const DATA_INTERVALS = [
  { value: 1, label: "1분" },
  { value: 5, label: "5분" },
  { value: 10, label: "10분" },
  { value: 30, label: "30분" },
]; // 데이터 통신 주기 설정 

export const HIVES = [
  { id: "1", name: "벌통 1호", status: "online" as const },
  { id: "2", name: "벌통 2호", status: "online" as const },
  { id: "3", name: "벌통 3호", status: "offline" as const },
]; //예시 벌통

export interface WeatherRegion {
  stn: number;
  name: string;
}

export const KMA_REGIONS: WeatherRegion[] = [
  { stn: 90, name: "속초" },
  { stn: 93, name: "북춘천" },
  { stn: 95, name: "철원" },
  { stn: 98, name: "동두천" },
  { stn: 99, name: "파주" },
  { stn: 100, name: "대관령" },
  { stn: 101, name: "춘천" },
  { stn: 102, name: "백령도" },
  { stn: 104, name: "북강릉" },
  { stn: 105, name: "강릉" },
  { stn: 106, name: "동해" },
  { stn: 108, name: "서울" },
  { stn: 112, name: "인천" },
  { stn: 114, name: "원주" },
  { stn: 115, name: "울릉도" },
  { stn: 119, name: "수원" },
  { stn: 121, name: "영월" },
  { stn: 127, name: "충주" },
  { stn: 129, name: "서산" },
  { stn: 130, name: "울진" },
  { stn: 131, name: "청주" },
  { stn: 133, name: "대전" },
  { stn: 135, name: "추풍령" },
  { stn: 136, name: "안동" },
  { stn: 137, name: "상주" },
  { stn: 138, name: "포항" },
  { stn: 140, name: "군산" },
  { stn: 143, name: "대구" },
  { stn: 146, name: "전주" },
  { stn: 152, name: "울산" },
  { stn: 155, name: "창원" },
  { stn: 156, name: "광주" },
  { stn: 159, name: "부산" },
  { stn: 162, name: "통영" },
  { stn: 165, name: "목포" },
  { stn: 168, name: "여수" },
  { stn: 169, name: "흑산도" },
  { stn: 170, name: "완도" },
  { stn: 172, name: "고창" },
  { stn: 174, name: "순천" },
  { stn: 177, name: "홍성" },
  { stn: 181, name: "서청주" },
  { stn: 184, name: "제주" },
  { stn: 185, name: "고산" },
  { stn: 188, name: "성산" },
  { stn: 189, name: "서귀포" },
  { stn: 192, name: "진주" },
  { stn: 201, name: "강화" },
  { stn: 202, name: "양평" },
  { stn: 203, name: "이천" },
  { stn: 211, name: "인제" },
  { stn: 212, name: "홍천" },
  { stn: 216, name: "태백" },
  { stn: 217, name: "정선군" },
  { stn: 221, name: "제천" },
  { stn: 226, name: "보은" },
  { stn: 232, name: "천안" },
  { stn: 235, name: "보령" },
  { stn: 236, name: "부여" },
  { stn: 238, name: "금산" },
  { stn: 239, name: "세종" },
  { stn: 243, name: "부안" },
  { stn: 244, name: "임실" },
  { stn: 245, name: "정읍" },
  { stn: 247, name: "남원" },
  { stn: 248, name: "장수" },
  { stn: 251, name: "고창군" },
  { stn: 252, name: "영광군" },
  { stn: 253, name: "김해시" },
  { stn: 254, name: "순창군" },
  { stn: 255, name: "북창원" },
  { stn: 257, name: "양산시" },
  { stn: 258, name: "보성군" },
  { stn: 259, name: "강진군" },
  { stn: 260, name: "장흥" },
  { stn: 261, name: "해남" },
  { stn: 262, name: "고흥" },
  { stn: 263, name: "의령군" },
  { stn: 264, name: "함양군" },
  { stn: 266, name: "광양시" },
  { stn: 268, name: "진도군" },
  { stn: 271, name: "봉화" },
  { stn: 272, name: "영주" },
  { stn: 273, name: "문경" },
  { stn: 276, name: "청송군" },
  { stn: 277, name: "영덕" },
  { stn: 278, name: "의성" },
  { stn: 279, name: "구미" },
  { stn: 281, name: "영천" },
  { stn: 283, name: "경주시" },
  { stn: 284, name: "거창" },
  { stn: 285, name: "합천" },
  { stn: 288, name: "밀양" },
  { stn: 289, name: "산청" },
  { stn: 294, name: "거제" },
  { stn: 295, name: "남해" },
  { stn: 296, name: "북부산" },
];
