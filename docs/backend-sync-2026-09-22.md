# 2026-09-22 백엔드 연동 확인

기준: [BeeKeeprs/was 70c9384](https://github.com/BeeKeeprs/was/commit/70c9384fa7cd9fe4d17d97a7b9e9695deb0f8c4d). GitHub에서 현재 소스와 DTO를 직접 확인함. 운영 배포 및 실제 장치 왕복은 검증하지 않음.

## 개폐기

- POST/GET `/api/v1/gates`, GET/PUT/DELETE `/api/v1/gates/{gateId}`. URL은 숫자 DB ID를 사용함.
- 목록 `{totalCount, gates}`, 상세 `lastConnectedAt`, `modifiedAt`, 수정 필드 `name/region/location/memo`, PUT/DELETE 204 응답을 확인함.
- 기존 작업 트리의 등록·목록·수정·삭제 연동은 이 계약과 일치함. 수정 시 상세 API를 먼저 읽도록 연결하고 목록의 `isConnected`를 보존함.
- 삭제는 서버에서 telemetry/bee-count/command 연관 기록도 삭제함. 사용자 소유의 공용 카드는 별도 리소스임.

## 벌통 MQTT → SSE → 앱

- 백엔드 `HiveTelemetryHandler` → `HiveTelemetryService.recordTelemetry` → `HIVE_TELEMETRY` 이벤트 경로 확인함. 앱은 기존 공용 SSE 연결을 사용함.
- 새 필드: `peltierMode`, `peltierDutyPct`, `fanHotDutyPct`, `fanColdDutyPct`, `fanState`, `targetTemperature`, `internalSensorValid`, `externalSensorValid`, `peltierCoolCurrentA`, `peltierHeatCurrentA`, `hwIssue`, `hwIssueTimestamp`.
- 새 상태를 store와 실시간 확인 화면에 전달함. null 측정값은 0으로 바꾸지 않으며 센서 유효성이 false인 센서의 온습도는 미수신 표시함. 외부 센서값을 내부 값으로 대체하지 않음.
- 목록 재조회 시 최근 장치 상태를 보존하고, 늦게 도착한 과거 이벤트가 새 상태를 덮어쓰지 않게 기존 시각 검증을 유지함.
- SSE 청크가 줄 끝에서 분리될 때 빈 줄 이전에 이벤트를 조기 처리하던 문제를 수정함.
- telemetry API의 구간별 `issues: [{code, timestamp}]`를 시간/기간별 병합에 보존함. 센서별 중복 이슈를 제거하고 실시간 확인 표에 표시함. `UNSYNCED_BOOT`는 기기 시간 동기화 전으로 표시함.
- 전 센서 조회 실패를 정상적인 빈 표로 취급하지 않도록 수정함.

## 검증 범위

- 네트워크 없는 계약/상태 테스트: SSE null/0/유효성/청크 경계, 오류 이력 병합, store 보존, 개폐기 CRUD의 URL/204/실패 및 기존 명령 폴링.
- 전체 TypeScript 검사는 기존 오류 131개로 실패하며 이번 변경으로 추가된 진단은 없음.
- 운영 API 인증 요청, 실제 MQTT 발행, 장치 제어, 네이티브 화면 확인 및 APK 빌드는 수행하지 않음. 설치된 독립 실행 APK에 반영하려면 새 APK 빌드·설치가 필요함.
