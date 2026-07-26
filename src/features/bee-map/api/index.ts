import {
  BEE_SELLER_PLACE_SEEDS,
  OURBEE_FARM_PLACE_SEEDS,
} from "../constants/mapPlaces";

export async function getBeeSellerPlaces() {
  // 판매처는 카카오/네이버 검색 결과가 흔들리지 않도록 검수된 seed 목록을 기준으로 표시합니다.
  return BEE_SELLER_PLACE_SEEDS;
}

export async function getOurbeeFarmPlaces() {
  // 우리 서비스 농장 위치 API가 생기면 이 배열 대신 API 응답을 같은 형태로 매핑합니다.
  return OURBEE_FARM_PLACE_SEEDS;
}
