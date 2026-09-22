/**
 * 개폐기(door-opener) 기기 자체를 등록/관리하기 위한 타입입니다.
 * 등록(POST)/목록(GET)/수정(PUT)/삭제(DELETE)가 모두 서버(/api/v1/gates)에 반영되며,
 * useGateStore는 서버 목록을 로컬(AsyncStorage)에 캐시해 오프라인에서도 마지막으로
 * 받은 목록을 보여줍니다. telemetry/bee-count 같은 리포트 데이터는 이 gateId로
 * 그때그때 서버에서 조회합니다.
 */
export interface GateData {
  id: string;
  gateId: number;
  macAddress: string;
  name: string;
  region?: string;
  location: string;
  memo?: string;
  registeredAt?: string;
  isConnected?: boolean;
  lastConnectedAt?: string | null;
  modifiedAt?: string | null;
}

export interface GateFormInput {
  id?: string;
  gateId?: number;
  macAddress: string;
  name: string;
  region?: string;
  location: string;
  memo?: string;
}
