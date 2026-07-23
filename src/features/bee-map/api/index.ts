import { OURBEE_FARM_PLACE_SEEDS } from "../constants/mapPlaces";
import type { BeeMapPlace } from "../model/mapPlace";

interface KakaoKeywordDocument {
  id: string;
  place_name: string;
  address_name?: string;
  road_address_name?: string;
  phone?: string;
  place_url?: string;
  x: string;
  y: string;
}

interface KakaoKeywordResponse {
  documents: KakaoKeywordDocument[];
}

function toCoordinate(value: string) {
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
}

function toSellerPlace(document: KakaoKeywordDocument): BeeMapPlace | null {
  const lng = toCoordinate(document.x);
  const lat = toCoordinate(document.y);

  if (lat == null || lng == null) return null;

  return {
    id: `seller-${document.id}`,
    kind: "seller",
    name: document.place_name,
    lat,
    lng,
    address: document.road_address_name || document.address_name,
    phone: document.phone,
    sourceUrl: document.place_url,
  };
}

export async function searchBeeSellerPlaces(restApiKey: string) {
  if (!restApiKey) return [];

  const params = new URLSearchParams({
    query: "수정벌",
    size: "15",
    sort: "accuracy",
  });

  try {
    const response = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?${params.toString()}`,
      {
        headers: {
          Authorization: `KakaoAK ${restApiKey}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Kakao local search failed: ${response.status}`);
    }

    const data = (await response.json()) as KakaoKeywordResponse;
    const places = data.documents.map(toSellerPlace).filter(Boolean) as BeeMapPlace[];
    console.log("[BeeMap API] 수정벌 판매처 조회 성공", { count: places.length });
    return places;
  } catch (error) {
    console.warn("[BeeMap API] 수정벌 판매처 조회 실패", error);
    throw error;
  }
}

export async function getOurbeeFarmPlaces() {
  // TODO: 백엔드의 스마트벌통 농장 지도 API가 확정되면 이 함수만 교체합니다.
  return OURBEE_FARM_PLACE_SEEDS;
}
