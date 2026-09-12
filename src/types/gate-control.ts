/**
 * 개폐기(door-opener) 기기 자체를 등록/관리하기 위한 타입입니다.
 * 등록(POST /api/v1/gates)은 서버에 반영되고 gateId를 받아오지만, 목록 조회 API가 없어
 * 등록된 개폐기 "목록" 자체는 계속 로컬(AsyncStorage)에만 보관합니다. telemetry/bee-count
 * 같은 리포트 데이터는 이 gateId로 그때그때 서버에서 조회합니다.
 */
export interface GateData {
  id: string;
  gateId: number;
  macAddress: string;
  name: string;
  location: string;
  memo?: string;
  registeredAt?: string;
}

export interface GateFormInput {
  id?: string;
  gateId?: number;
  macAddress: string;
  name: string;
  location: string;
  memo?: string;
}
