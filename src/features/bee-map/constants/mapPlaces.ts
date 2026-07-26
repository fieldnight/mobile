import type { BeeMapPlace } from "../model/mapPlace";

function buildNaverMapSearchUrl(query: string) {
  return `https://map.naver.com/p/search/${encodeURIComponent(query)}`;
}

function sellerPlace({
  id,
  name,
  lat,
  lng,
  address,
  phone,
  homepage,
}: Omit<BeeMapPlace, "id" | "kind" | "sourceUrl" | "sourceName"> & {
  id: string;
  homepage?: string;
}) {
  return {
    id: `seller-${id}`,
    kind: "seller",
    name,
    lat,
    lng,
    address,
    phone,
    description: "화분매개벌 및 수정벌 판매처",
    sourceName: "지도보기",
    sourceUrl: homepage ?? buildNaverMapSearchUrl(`${name} ${address ?? ""}`),
  } satisfies BeeMapPlace;
}

export const BEE_SELLER_PLACE_SEEDS: BeeMapPlace[] = [
  sellerPlace({
    id: "beemaya",
    name: "수정벌마야",
    lat: 35.6954215,
    lng: 128.0072631,
    address: "경상남도 거창군 가조면 동례길 412-49",
    homepage: "https://beemaya.modoo.at",
  }),
  sellerPlace({
    id: "doorebees",
    name: "두레수정벌",
    lat: 37.4539051,
    lng: 127.3381149,
    address: "경기도 광주시 퇴촌면 천진암로 678",
    homepage: "https://www.doorebees.com",
  }),
  sellerPlace({
    id: "pungnyeon",
    name: "풍년수정벌",
    lat: 37.6723946,
    lng: 126.5788203,
    address: "경기도 김포시 통진읍 가현로105번길 151-4",
  }),
  sellerPlace({
    id: "sallim",
    name: "살림 농업회사 법인",
    lat: 35.4526435,
    lng: 128.695647,
    address: "경상남도 밀양시 초동면 봉황남길 13-6",
    phone: "010-8558-1972",
    homepage: "https://sallimbee.com",
  }),
  sellerPlace({
    id: "daesan",
    name: "수정벌 대산",
    lat: 35.3406945,
    lng: 128.7264629,
    address: "경상남도 창원시 의창구 대산면 북부로 36",
    homepage: "https://www.sjbul.com",
  }),
  sellerPlace({
    id: "green-agrotech",
    name: "그린아그로텍",
    lat: 35.8598869,
    lng: 128.7891119,
    address: "경상북도 경산시 압량읍 인안길 99",
    phone: "053-818-3272",
    homepage: "http://www.sptrap.co.kr",
  }),
  sellerPlace({
    id: "gb-sericulture",
    name: "경상북도 농업자원관리원 잠사곤충사업장",
    lat: 36.5784243,
    lng: 128.1611135,
    address: "경상북도 상주시 함창읍 무운로 1621-27",
    homepage: "https://www.gb.go.kr",
  }),
  sellerPlace({
    id: "yecheon-insect",
    name: "예천군 곤충연구소",
    lat: 36.8245796,
    lng: 128.4582001,
    address: "경상북도 예천군 효자면 은풍로 1045",
    phone: "054-652-5876",
    homepage: "https://www.ycg.kr",
  }),
  sellerPlace({
    id: "koppert",
    name: "코퍼트",
    lat: 37.4221154,
    lng: 127.3048718,
    address: "경기도 광주시 초월읍 산수로645번길 48-3",
    homepage: "http://www.koppert.co.kr",
  }),
  sellerPlace({
    id: "jirisanjungbeol",
    name: "지리산수정벌",
    lat: 35.2459022,
    lng: 127.8948147,
    address: "경상남도 산청군 단성면 옥단로 1871-1",
  }),
  sellerPlace({
    id: "vipla-bee",
    name: "비플라이 양봉원",
    lat: 37.2999859,
    lng: 127.2201431,
    address: "경기도 용인시 처인구 포곡읍 에버랜드로376번길 210-36",
  }),
  sellerPlace({
    id: "native-bee-union",
    name: "전국토종벌꿀협동조합",
    lat: 36.1240164,
    lng: 127.1368995,
    address: "충청남도 논산시 연무읍 동안로 1228",
  }),
  sellerPlace({
    id: "mungyeong-native-bee",
    name: "문경토종벌농장",
    lat: 36.6526522,
    lng: 128.206546,
    address: "경상북도 문경시 호계면 우로2길 17-3",
  }),
  sellerPlace({
    id: "dalgom-honey",
    name: "달곰허니&수정벌",
    lat: 36.0587523,
    lng: 127.085952,
    address: "전북특별자치도 익산시 여산면",
  }),
  sellerPlace({
    id: "sabonsoe",
    name: "사봉쇠꿀벌농원",
    lat: 35.1574258,
    lng: 127.0412455,
    address: "전라남도 담양군 가사문학면",
  }),
  sellerPlace({
    id: "strong-bee",
    name: "강한벌",
    lat: 37.3885104,
    lng: 127.9853743,
    address: "강원특별자치도 원주시 소초면 노루고개길 32",
  }),
  sellerPlace({
    id: "natural-pollination-bee",
    name: "자연수정벌",
    lat: 36.3251263,
    lng: 129.075106,
    address: "경상북도 청송군 부남면 강변마길 65",
  }),
  sellerPlace({
    id: "allbarn-bumblebee",
    name: "올바른호박벌",
    lat: 37.7967094,
    lng: 126.7401841,
    address: "경기도 파주시 검산로 301-13",
    phone: "031-949-1162",
  }),
];

// 우리 서비스 농장 위치 API가 생기면 이 배열 대신 API 응답을 같은 형태로 매핑합니다.
export const OURBEE_FARM_PLACE_SEEDS: BeeMapPlace[] = [];
