export const WHOLESALE_MARKETS = [
  { code: "110001", name: "서울가락" },
  { code: "110008", name: "서울강서" },
  { code: "210001", name: "부산엄궁" },
  { code: "210005", name: "부산국제수산" },
  { code: "210009", name: "부산반여" },
  { code: "220001", name: "대구북부" },
  { code: "230001", name: "인천남촌" },
  { code: "230003", name: "인천삼산" },
  { code: "240001", name: "광주각화" },
  { code: "240004", name: "광주서부" },
  { code: "250001", name: "대전오정" },
  { code: "250003", name: "대전노은" },
  { code: "310101", name: "수원" },
  { code: "310401", name: "안양" },
  { code: "310901", name: "안산" },
  { code: "311201", name: "구리" },
  { code: "320101", name: "춘천" },
  { code: "320201", name: "원주" },
  { code: "320301", name: "강릉" },
  { code: "330101", name: "청주" },
  { code: "330201", name: "충주" },
  { code: "340101", name: "천안" },
  { code: "350101", name: "전주" },
  { code: "350301", name: "익산" },
  { code: "350402", name: "정읍" },
  { code: "360301", name: "순천" },
  { code: "370101", name: "포항" },
  { code: "370401", name: "안동" },
  { code: "371501", name: "구미" },
  { code: "380101", name: "창원팔용" },
  { code: "380201", name: "울산" },
  { code: "380303", name: "창원내서" },
  { code: "380401", name: "진주" },
] as const;
//시세확인용 도매시장 코드

export const LARGE_CATEGORY: Record<string, string> = {
  "01": "미곡류",
  "02": "맥류",
  "03": "두류",
  "04": "잡곡류",
  "05": "서류",
  "06": "과실류(🍐🍎🍊)",
  "07": "수실류",
  "08": "과일과채류(🍓🍅🍉🍈+참외)",
  "09": "과채류",
};
//시세확인용 식품 대분류 코드

export const QUICK_SEARCH_ITEMS = ["딸기", "사과", "배", "포도", "토마토"]; //빠르게 보기 버튼

export const CACHE_TTL = 5 * 60 * 1000; // 5분
export const middleKey = (name: string) => `middle_${name}`;
export const getTodayKST = () =>
  new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);


// ──결과 테이블 정보 ─────────────────────────────────────────────────────────────────────

export const COLUMNS = [
  { key: "scsbd_dt", label: "낙찰일시", baseWidth: 70 },
  { key: "corp_nm", label: "법인명", baseWidth: 100 },
  { key: "gds_mclsf_nm", label: "중분류명", baseWidth: 80 },
  { key: "plor_nm", label: "원산지명", baseWidth: 80 },
  { key: "scsbd_prc", label: "낙찰가(원)", baseWidth: 90 },
  { key: "qty", label: "수량", baseWidth: 55 },
  { key: "unit_qty", label: "단위물량", baseWidth: 65 },
];

export const DETAIL_FIELDS = [
  { key: "scsbd_dt", label: "낙찰일시" },
  { key: "whsl_mrkt_nm", label: "도매시장명" },
  { key: "corp_nm", label: "법인명" },
  { key: "gds_mclsf_nm", label: "중분류명" },
  { key: "gds_sclsf_nm", label: "소분류명" },
  { key: "corp_gds_vrty_nm", label: "법인상품품종명" },
  { key: "plor_nm", label: "원산지명" },
  { key: "scsbd_prc", label: "낙찰가(원)" },
  { key: "qty", label: "수량" },
  { key: "unit_qty", label: "단위물량(KG)" },
  { key: "pkg_nm", label: "포장명" },
];
