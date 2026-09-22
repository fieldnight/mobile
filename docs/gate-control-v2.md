# 개폐기 카드 제어 API MQTT 연동 명세 v2

사용자가 제공한 최종 [원문 텍스트](gate-control-spec-v2.source.txt)를 기준으로 정리한 문서입니다. 스크린샷과 텍스트의 v2 계약은 일치합니다. 원문의 ‘99+/무제한’ 설명은 사용자 최종 지시로 정정합니다. 99는 실제 99마리이며 무제한 기능은 없습니다. 온라인 제어의 계약이며 NFC 직통신은 별도 [NFC 명세](embedded-hce-payload.md)를 따릅니다. 이 문서는 구현 완료를 뜻하지 않습니다.

## 1 전체 흐름

앱 → REST → 백엔드 → MQTT → 개폐기 순서로 실행합니다. 사용자가 선택한 개폐기마다 실행 요청을 한 건씩 보냅니다. 백엔드는 commandId를 발급하고 202로 접수 응답을 반환합니다. 기기의 결과 MQTT를 받은 뒤 앱의 명령 결과 조회에 성공 또는 실패를 반환합니다.

## 2 카드 종류

| cardType | 기능 | payload |
| --- | --- | --- |
| OPEN_NOW | 즉시 열기 ON | 없음 또는 {} |
| CLOSE_NOW | 즉시 닫기 OFF | 없음 또는 {} |
| COUNT_STATUS | 출입 카운트 확인 COUNT | 없음 또는 {} |
| OPEN_AT | 열기 예약 | TIME |
| CLOSE_AT | 닫기 예약 | TIME |
| WINDOW | 여닫기 시간대 운영 | TIME |
| ALTERNATE_24H | 24시간 교대 | TIME |
| COUNT_CONTROL | 벌 마릿수 제어 | COUNT |

ON/OFF/COUNT는 고정 카드이며 추가·수정 대상이 아닙니다. 커스텀 카드 추가는 시간 제어와 벌 마릿수 제어 중 하나를 선택합니다. 온라인 enum에는 LOCK_DAYS가 없습니다. 기존 농약방제 카드의 NFC 호환은 별도 처리하며 온라인 enum에 임의로 추가하지 않습니다.

## 3 실행 요청

`POST /api/v1/gates/{gateId}/commands`

```json
{
  "gateId": "AA:BB:CC:DD:EE:FF",
  "operation": "EXECUTE",
  "cardType": "WINDOW",
  "title": "09:00~14:00 여닫기",
  "memo": "남쪽 과수원 아침 개방",
  "payload": { "start": "09:00", "end": "14:00", "repeat": true }
}
```

- gateId: 콜론 포함 대문자 MAC. 정규식 `^([0-9A-F]{2}:){5}[0-9A-F]{2}$`. path와 body가 같아야 합니다. 앱의 숫자 DB gateId와 혼동하지 않습니다.
- operation: EXECUTE. 생략하면 EXECUTE로 처리하여 v1과 호환합니다.
- title: 필수, 앱 자동 생성, 최대 40자.
- memo: 선택, 최대 40자. 없으면 키 생략. 고정 ON/OFF/COUNT 카드에는 보내지 않습니다.
- payload: 아래 타입별 구조. 파라미터 없는 세 카드는 생략 또는 {}.
- 확정본에는 cardId 필드가 없습니다.

## 4 TIME payload

| cardType | start | end | repeat |
| --- | --- | --- | --- |
| OPEN_AT | HH:MM | 생략 | boolean |
| CLOSE_AT | 생략 | HH:MM | boolean |
| WINDOW | HH:MM | HH:MM | boolean |
| ALTERNATE_24H | close_first 또는 open_first | 생략 | boolean |

WINDOW는 start부터 end까지 열고 나머지는 닫습니다. UI는 최소 1시간 간격을 유지합니다. 시각은 30분 단위이며 종료 시각은 24:00까지 허용합니다. ALTERNATE_24H의 start는 시각이 아니라 시작 방향입니다.

## 5 COUNT payload

```json
{
  "days": ["mon", "wed", "fri"],
  "countRange": { "low": 3, "high": 12 },
  "timeWindow": { "start": "00:00", "end": "24:00" },
  "rules": {
    "within": { "entranceOpen": true, "exitOpen": true },
    "above": { "entranceOpen": true, "exitOpen": false }
  }
}
```

- 기준: 현재 활동 중인 벌 수 = 출구로 나간 수 − 입구로 들어온 수.
- days: sun/mon/tue/wed/thu/fri/sat 배열. [] 또는 null은 단발성, 7개 모두면 매일.
- low/high: 정수, `0 ≤ low ≤ high ≤ 99`.
- timeWindow: 30분 단위. 종료는 24:00 허용. 00:00~24:00은 종일.
- rules에는 within/above만 존재합니다. below 필드를 추가하지 않습니다.

사용자가 대화에서 추가로 확정한 실행 의미는 다음과 같습니다. 원본 JSON 구조는 변경하지 않습니다.

| 조건 | 동작 |
| --- | --- |
| count < low | 입구 닫힘, 출구 열림 |
| low ≤ count < high | within |
| count ≥ high | above |
| 지정 요일 또는 감시 시간 밖 | 양쪽 문 열림 |

high는 항상 정량값이며 99도 실제 99입니다. high 경계는 원문의 ‘high 이상’을 above로 해석합니다. 단발성 COUNT는 대상 시간 구간 종료 시 규칙을 해제하고 양쪽 문을 엽니다. 반복 COUNT는 설정을 유지하고 다음 지정 시간에 재개합니다. 이 자동 종료 의미를 기존 TIME 카드에 확대하지 않습니다.

## 6 접수와 결과 조회

접수 응답은 HTTP 202입니다.

```json
{
  "code": "OK", "message": "명령이 접수됐어요.",
  "data": { "commandId": "cmd_9f2a1c", "gateId": "AA:BB:CC:DD:EE:FF", "status": "PENDING" }
}
```

오프라인 오류 예시는 `{"code":"GATE_OFFLINE","message":"개폐기가 오프라인 상태예요.","data":null}`입니다.

`GET /api/v1/gates/{gateId}/commands/{commandId}`

```json
{
  "code": "OK", "message": "OK",
  "data": { "commandId": "cmd_9f2a1c", "status": "SUCCESS", "detail": null }
}
```

상태: PENDING → SUCCESS / FAILED / TIMEOUT. 앱은 1~2초 간격으로 최대 15~20초 조회합니다. 서버 타임아웃 예시는 15초입니다. SSE 확장은 이번 계약에 포함하지 않습니다.

커스텀 카드 서버 저장은 기존 GateActionRequest CRUD를 사용하되 새 envelope/payload를 담도록 확장해야 합니다. 기존 title/actionType/actionTime/repeatEnabled만으로 COUNT 설정을 저장할 수 없습니다.

## 7 MQTT 명령과 결과

- 명령: `gates/{gateId}/command`
- 결과: `gates/{gateId}/result`
- QoS 1 권장, 명령 retain 사용 안 함.
- title/memo는 MQTT에서 제외합니다. cardType과 payload는 REST와 동일합니다.

```json
{
  "commandId": "cmd_9f2a1c",
  "gateId": "AA:BB:CC:DD:EE:FF",
  "operation": "EXECUTE",
  "cardType": "WINDOW",
  "payload": { "start": "09:00", "end": "14:00", "repeat": true }
}
```

기존 결과의 필드는 commandId, gateId, status(OK/ERROR), detail(null 또는 오류 설명)입니다. v2는 아래 두 필드만 확장합니다.

## 8 실행 취소와 결과 확장

실행과 같은 POST 주소와 MQTT command 토픽을 사용합니다.

```json
{
  "gateId": "AA:BB:CC:DD:EE:FF",
  "operation": "CANCEL",
  "targetCommandId": "cmd_original"
}
```

취소에는 cardType/title/payload가 필요하지 않습니다. 서버는 취소 요청에 새 commandId를 발급합니다. MQTT에는 새 commandId와 위 필드를 전달합니다. 원래 실행 ID와 취소 요청 자체의 ID는 다릅니다. 취소 시 문 동작은 임베디드가 처리하며, 사용자 확정 동작은 규칙 해제와 양쪽 문 열기입니다.

취소 성공 결과:

```json
{
  "commandId": "cmd_cancel",
  "gateId": "AA:BB:CC:DD:EE:FF",
  "status": "OK",
  "detail": null,
  "executionCommandId": "cmd_original",
  "executionStatus": "CANCELLED"
}
```

- 실행 성공: executionCommandId는 자신의 commandId, executionStatus는 ACTIVE.
- 취소 성공: executionCommandId는 targetCommandId, executionStatus는 CANCELLED.
- 실행/취소 실패: status는 ERROR. 실행 상태는 성공한 것처럼 바꾸지 않습니다.
- executionStatus는 ACTIVE/CANCELLED 두 값만 정의합니다.
- eventType, EXPIRED, REPLACED, 별도 state 토픽은 이번 확정본에 없습니다.

## 9 적용 중 명령 조회

`GET /api/v1/gates/{gateId}/commands/current`

```json
{
  "code": "OK", "message": "OK",
  "data": {
    "commandId": "cmd_original",
    "cardType": "WINDOW",
    "title": "09:00~14:00 여닫기",
    "memo": "남쪽 과수원 아침 개방",
    "payload": { "start": "09:00", "end": "14:00", "repeat": true },
    "executionStatus": "ACTIVE",
    "appliedAt": "2026-09-13T09:00:00+09:00"
  }
}
```

ACTIVE 실행이 없으면 HTTP 200과 `{"code":"OK","message":"OK","data":null}`을 반환합니다. 404가 아닙니다. 서버가 누적 저장한 결과를 읽으며 조회마다 MQTT를 보내지 않습니다.

온라인 실행만 대상입니다. NFC로 로컬 적용한 카드 상태는 휴대폰에만 남고 이 API에서 조회하지 않습니다. 별도 카드별 조회 API는 확정본에 없습니다.

## 10 이번 작업 범위와 계약의 경계

이 문서는 목표 v2 계약입니다. 이후 PR #188/#193/#194 기준 온라인 실행·리포트·MQTT 수신을 연결했으며, 실제 백엔드와의 차이 및 남은 제약은 [현재 PR 연동 문서](gate-backend-pr-integration.md)에 정리합니다. 기존 미확인 온라인 로컬 기록은 확인된 상태로 취급하지 않습니다.

온라인 자동 종료 보고 방식과 COUNT_STATUS의 카운트 반환 형식은 스크린샷에 정의되지 않았습니다. 임의로 필드를 추가하지 않습니다. NFC COUNT의 자동 종료는 임베디드 로컬 동작으로 구현하며 온라인 executionStatus를 추가하지 않습니다.
