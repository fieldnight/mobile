# 개폐기 백엔드 PR 연동 — 2026-09-13

기준: [PR #188](https://github.com/BeeKeeprs/was/pull/188), [PR #193](https://github.com/BeeKeeprs/was/pull/193), [PR #194](https://github.com/BeeKeeprs/was/pull/194). 모두 병합됨. #194 확인 SHA: `cdefaf3535640ebf86c20dc3b87a951b4e7e8b85`. 병합 여부가 운영 서버 배포 완료를 의미하지는 않습니다.

사용자가 준 [최종 TXT](gate-control-spec-v2.source.txt)는 목표 규격입니다. 현재 백엔드와 다른 부분은 아래 어댑터로 구분합니다. NFC의 WB2 규격과 99=99 규칙은 유지합니다.

## 현재 연결한 경로

| 기능 | 앱 / 개폐기 동작 |
|---|---|
| 온라인 리포트 | `GET /api/v1/gates/{숫자 gateId}/telemetry?period=DAY&sensorType=TEMPERATURE`와 `/bee-count?period=DAY` 조회. HUMIDITY 및 WEEK/MONTH 지원 |
| 오프라인 리포트 | NFC로 받은 휴대폰 로컬 기록만 표시. 온라인 리포트와 동시에 렌더링하거나 API 데이터로 대체하지 않음 |
| 온라인 실행 | 선택한 개폐기마다 `POST /api/v1/gates/{숫자 gateId}/commands` 후 같은 경로의 `/{commandId}` 폴링 |
| 실행 MQTT | `gate/{대문자 콜론 MAC}/command` 구독 → 기존 NFC와 같은 제어 엔진 적용 → `gate/{MAC}/result` 보고 |
| 통로 경고 | `gate/{MAC}/tunnel-alert`로 tunnel/sensor/blockedSeconds/servoDeferred/occurredAt 발행 |

센서 조회 예: `/api/v1/gates/42/telemetry?period=DAY&sensorType=TEMPERATURE`.
리포트 API의 벌 카운트는 서버가 조회 구간별로 평균낸 값이며, NFC 버킷 합계와 같은 값이라고 가정하지 않습니다. 데이터가 없으면 null입니다. 온라인 조회 오류를 정상적인 빈 응답으로 숨기지 않습니다.

### 실행 요청 및 결과

REST 경로의 숫자 ID와 본문의 MAC을 혼동하지 않습니다.

```json
{"gateId":"AA:BB:CC:DD:EE:FF","cardType":"WINDOW","title":"09:30~14:00 여닫기","payload":{"start":"09:30","end":"14:00","repeat":true}}
```

백엔드가 보내는 MQTT에는 title/memo 대신 commandId가 들어갑니다.

```json
{"commandId":"서버-발급-ID","gateId":"AA:BB:CC:DD:EE:FF","cardType":"WINDOW","payload":{"start":"09:30","end":"14:00","repeat":true}}
```

```json
{"commandId":"서버-발급-ID","gateId":"AA:BB:CC:DD:EE:FF","status":"OK","detail":null}
```

오류는 `status: "ERROR"`와 detail로 회신합니다. 현재는 operation, targetCommandId, executionStatus를 보내지 않습니다. 취소와 `/commands/current`를 호출하지 않습니다.

앱은 SUCCESS 응답 확인 후에만 적용 기록을 남깁니다. PENDING/FAILED/TIMEOUT은 성공이 아닙니다. POST 응답이 끊기면 자동으로 실행을 반복하지 않습니다. 여러 개폐기의 결과는 각각 확인합니다. 로컬 적용 기록은 마지막 확인 기록이며 현재 실행 상태 API를 대신하지 않습니다.

임베디드는 메시지 조각을 최대 1535바이트까지 조립하고 잘못된 토픽/MAC/설정값을 거절합니다. retained 명령은 실행하지 않습니다. 최근 8개 commandId는 중복 실행 없이 같은 결과를 회신합니다(재부팅하면 중복 기록 초기화). 적용 처리는 별도 작업에서 수행해 MQTT 수신을 막지 않습니다. 결과는 QoS 1, retain=false입니다.

## TXT와 아직 다른 부분

- 토픽: 목표 `gates/...`와 달리 현재 PR은 단수 `gate/...`.
- REST 경로: 목표 MAC과 달리 현재 PR은 숫자 DB ID. 본문 gateId는 MAC.
- 취소/실행 상태 조회: 미구현. 앱에서 임의의 취소 엔드포인트나 OFF=취소를 만들지 않음.
- 카드 저장 CRUD: #194에서 옛 `/hives/{hiveId}/gate/actions`가 제거됨. 앱의 해당 자동 동기화/생성/삭제 요청을 중단함.
- 새 카드 CRUD는 개폐기별 `/gates/{gateId}/cards/time` 및 `/gates/{gateId}/cards/count`, 정수 startHour/endHour를 사용함. 09:30 같은 현재 UI 값을 손실 없이 저장할 수 없고 COUNT maxCount=0도 요청 검증과 충돌함. 현재 카드는 휴대폰에 원형 그대로 저장하고 실행 API의 HH:MM/중첩 payload로 실행함. 새 CRUD 동기화는 아직 연결하지 않음.
- COUNT_STATUS 결과 DTO에는 카운트 숫자가 없음. 온라인 카운트는 리포트 API로 읽고, 결과 OK만으로 새 카운트가 왔다고 표시하지 않음.

## 백엔드에서 확인/수정할 사항

1. **연결 상태 갱신 누락:** Gate 생성 시 isConnected=false. GateCommandService는 false면 GATE_OFFLINE을 반환함. 확인한 Gate 엔티티/텔레메트리 저장 서비스/MQTT 토픽 목록에는 gate 연결 상태 갱신 경로가 없음. 등록 개폐기의 온라인 판정과 갱신을 구현해야 일반적인 실행 경로가 열림. 이를 우회해 앱에서 연결됐다고 가정하지 않음.
2. **빠른 결과 수신과 트랜잭션:** issueCommand가 DB 트랜잭션 안에서 MQTT를 발행하고, handleResult는 명령을 못 찾으면 로그만 남김. 커밋 전에 결과가 돌아오면 유실될 가능성이 있으므로 커밋 후 발행/outbox 또는 결과 재처리를 검토해야 함.
3. 결과 수신 시 MQTT 토픽 MAC과 command 소유 개폐기의 일치 검증 필요. 현재 handler는 MAC을 service로 전달하지 않고 commandId만 사용함.
4. 운영 서버에 세 PR의 API/DB 변경이 실제 배포됐는지 확인 필요. 앱/임베디드 코드 및 PC 테스트만으로 실서버 저장·FCM 도착을 보증하지 않음.

## 태깅 주의사항

카드 팝업에 적용 완료 알림까지 대고 있으라는 안내와 다음 내용을 표시합니다.

> 알림이 안 오면 휴대폰을 떼고 2초 이상 기다린 뒤 다시 대주세요. 알림을 못 받아도 이미 적용됐을 수 있어요.

카드 전달/시간 동기화/결과 회신/통계 분할 전송은 여러 번 왕복합니다. 적용 알림 뒤에도 통계가 이어집니다. 적용 성공은 설정/명령 수락이며 물리적인 문 위치 피드백이 아닙니다.

## 검증

- 앱의 실제 JSON 생성과 API 클라이언트를 mock 서버로 검증: 숫자 경로/MAC 본문, 정확한 99, PENDING→SUCCESS, 실패/타임아웃, POST 재실행 방지.
- 실제 C 파서와 제어 엔진을 PC에서 검증: JSON 변환/경계값/문 상태/요일/자동 종료.
- 실제 MQTT 수신 코드를 mock 전송 계층으로 검증: 분할 조립/중복 재실행 방지/다른 토픽과 retained 거절/경고 토픽 및 시각 형식.
- 실제 브로커 명령 발행, 앱 설치, ESP-IDF 빌드/플래시, 실물 동작/FCM 수신은 수행하지 않음.
- 앱 서버의 `/v3/api-docs` 읽기를 시도했으나 HTTP 302 응답으로 배포된 API 목록을 확인하지 못함. 인증된 실행 요청은 수행하지 않음.

실물 확인은 백엔드 온라인 상태 문제 해결 후 등록 기기에서 API 접수→MQTT 수신→result→SUCCESS→리포트 조회 순서로 해야 합니다.
