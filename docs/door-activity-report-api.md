# 벌 활동 AI 리포트 API 요청서

## 1. 엔드포인트

```http
POST /api/v1/assistants/door-reports
Content-Type: application/json
Authorization: Bearer {accessToken}
```

- 분석 범위: 요청한 날짜의 00:00부터 현재까지
- 시간대: `Asia/Seoul`
- AI 응답 문자열을 그대로 반환하지 않고 아래 응답 DTO로 변환해서 반환
- 기존 수정벌 업체 자료를 RAG로 참고하되, 요청에 없는 측정값은 만들지 않음

## 2. 요청 JSON

```json
{
  "deviceId": "WBEE-001",
  "analysisDate": "2026-07-22",
  "timezone": "Asia/Seoul",
  "trafficSummary": {
    "entered": 32,
    "exited": 41
  },
  "latestGateState": "OPEN",
  "hourlyStats": [
    {
      "time": "09:00",
      "entered": 12,
      "exited": 13,
      "gateState": "OPEN",
      "temperatureC": 26.1,
      "humidityPercent": 58.0
    },
    {
      "time": "10:00",
      "entered": 11,
      "exited": 15,
      "gateState": "OPEN",
      "temperatureC": 27.2,
      "humidityPercent": 59.5
    },
    {
      "time": "11:00",
      "entered": 9,
      "exited": 13,
      "gateState": "OPEN",
      "temperatureC": 28.3,
      "humidityPercent": 61.0
    }
  ],
  "climateSamples": [
    {
      "time": "10:30",
      "temperatureC": 27.5,
      "humidityPercent": 60.0
    },
    {
      "time": "10:40",
      "temperatureC": 27.8,
      "humidityPercent": 60.2
    },
    {
      "time": "10:50",
      "temperatureC": 28.0,
      "humidityPercent": 60.6
    },
    {
      "time": "11:00",
      "temperatureC": 28.3,
      "humidityPercent": 61.0
    }
  ]
}
```

### 요청 필드 규칙

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| `deviceId` | string | O | 개폐기 장치 ID |
| `analysisDate` | `yyyy-MM-dd` | O | 분석 날짜 |
| `timezone` | string | O | 기본값 `Asia/Seoul` |
| `trafficSummary.entered` | integer | O | 해당 날짜에 들어온 벌 누적 수 |
| `trafficSummary.exited` | integer | O | 해당 날짜에 나간 벌 누적 수 |
| `latestGateState` | enum | O | `OPEN`, `CLOSED`, `UNKNOWN` |
| `hourlyStats` | array | O | 1시간 단위 출입 및 평균 온습도. 데이터가 없으면 빈 배열 |
| `climateSamples` | array | O | 10분 단위 온습도 원본. 데이터가 없으면 빈 배열 |

`hourlyStats.temperatureC`, `hourlyStats.humidityPercent`는 측정값이 없으면 `null`을 허용합니다.

## 3. 성공 응답 JSON

```json
{
  "code": "SUCCESS",
  "message": "벌 활동 리포트를 만들었어요.",
  "data": {
    "status": "CAUTION",
    "summary": "벌통 내부 온도가 조금 높고, 나간 벌이 더 많아요. 온도를 낮춘 뒤 귀소량을 다시 확인해 주세요.",
    "observations": [
      "나간 벌이 들어온 벌보다 9마리 많아요.",
      "내부 온도가 권장 상한보다 1.3°C 높아요."
    ],
    "details": {
      "overview": [
        {
          "label": "오늘 총 출입",
          "value": "73마리",
          "note": "들어옴 32마리, 나감 41마리예요.",
          "status": "NORMAL"
        },
        {
          "label": "출입 차이",
          "value": "-9마리",
          "note": "아직 돌아오지 않은 벌이 더 많아요.",
          "status": "CAUTION"
        }
      ],
      "activityAnalysis": [
        {
          "label": "들어온 벌",
          "value": "32마리",
          "note": "오늘 들어온 벌의 누적 수예요.",
          "status": "NORMAL"
        },
        {
          "label": "나간 벌",
          "value": "41마리",
          "note": "들어온 벌보다 9마리 많아요.",
          "status": "CAUTION"
        }
      ],
      "climateAnalysis": [
        {
          "label": "내부 온도",
          "value": "28.3°C",
          "note": "권장 범위 24~27°C보다 높아요.",
          "status": "CAUTION"
        },
        {
          "label": "내부 습도",
          "value": "61%",
          "note": "최근 측정된 습도예요.",
          "status": "NORMAL"
        }
      ],
      "hourlyAnalysis": "오전 9시부터 11시까지 시간당 활동량은 25마리에서 22마리로 줄었고, 같은 시간 온도는 26.1°C에서 28.3°C로 올랐어요. 습도도 58%에서 61%로 올랐지만 온습도가 활동량 감소의 직접 원인이라고 단정하기는 어려워요.",
      "solutionGuide": [
        {
          "title": "직사광선을 줄여주세요",
          "description": "벌통에 햇빛이 직접 닿는다면 차광막으로 그늘을 만들어 주세요. 위치를 옮겨야 한다면 활동이 적은 시간에 제품 안내에 따라 서늘한 곳으로 이동해요."
        },
        {
          "title": "공기가 지나갈 공간을 만들어주세요",
          "description": "환기구와 출입구를 막은 벌이나 이물질을 정리해 주세요. 벌통 주변에 물건이 붙어 있다면 공기가 흐를 수 있도록 간격을 확보해요."
        },
        {
          "title": "30분 뒤 다시 확인해 주세요",
          "description": "내부 온도가 27°C 이하로 내려오는지 다시 측정해 주세요. 저녁에는 들어온 벌과 나간 벌의 차이도 함께 확인해요."
        }
      ]
    },
    "sources": [
      "수정벌 관리 자료"
    ],
    "generatedAt": "2026-07-22T11:01:30+09:00"
  }
}
```

## 4. 응답 필드 규칙

| 필드 | 규칙 |
|---|---|
| `status` | 아래 상태 판단 기준에 따라 `GOOD`, `NORMAL`, `CAUTION` 중 하나 |
| `summary` | 토스체 존댓말 1~2문장 |
| `observations` | 실제 데이터에서 확인되는 변화 2~3개. 항목당 한 문장 |
| `overview` | 2~4개 표 항목. 전체 출입과 핵심 상태 |
| `activityAnalysis` | 2~4개 표 항목. 벌 출입 분석 |
| `climateAnalysis` | 2~4개 표 항목. 온습도 분석 |
| `hourlyAnalysis` | 시간당 온습도와 벌 활동 마릿수 변화를 함께 설명하는 1~2문장 |
| `solutionGuide` | 주제별 2~4개. `title`과 2~3문장의 `description` |
| `sources` | 실제 RAG에서 참고한 문서 제목. 없으면 빈 배열 |

### 상태 판단 기준

상태는 백엔드 서비스 로직에서 먼저 계산하고, LLM은 계산된 상태를 설명만 합니다. LLM이 반환한 상태값은 사용하지 않습니다. 시간당 활동량은 해당 시간의 `entered + exited`입니다.

#### CAUTION

아래 조건 중 하나라도 만족하면 `CAUTION`입니다.

1. 최근 30분을 포함하는 온도 표본이 4개 이상이고, 모든 표본이 `24~27°C`를 벗어났습니다.
2. 최근 완료된 2시간의 활동량이 각각 해당 시점의 직전 3시간 평균보다 30% 이상 낮습니다.

#### NORMAL

`CAUTION`과 `GOOD` 조건에 해당하지 않거나 비교할 데이터가 부족하면 `NORMAL`입니다.

#### GOOD

아래 조건을 모두 만족하면 `GOOD`입니다.

1. 최근 30분을 포함하는 온도 표본이 4개 이상이고, 모든 표본이 `24~27°C`입니다.
2. 최근 완료된 시간의 활동량이 직전 3시간 평균보다 감소하지 않았거나 감소 폭이 15% 미만입니다.
3. 활동량 비교에 필요한 완료된 시간 데이터가 4개 이상입니다.

들어온 벌과 나간 벌의 단순 차이만으로 상태를 `CAUTION`으로 정하지 않습니다. 귀소 시간 전에는 나간 벌이 더 많은 흐름이 자연스러울 수 있습니다.

> 위 수치는 서비스의 1차 운영 기준입니다. 실제 현장 데이터가 쌓이면 농가, 계절, 시간대별 기준으로 조정합니다.

### AI 작성 필수 조건

1. 수정벌 권장 활동 온도는 `24~27°C`로 사용합니다.
2. 요청에 없는 수치, 변화율, 원인은 만들지 않습니다.
3. 데이터가 부족하면 비교하지 않고 부족하다고 적습니다.
4. 시간당 온습도와 같은 시간의 벌 활동 마릿수 변화를 함께 비교해 1~2문장으로 작성합니다.
5. 온습도와 활동량이 함께 변해도 직접적인 원인이라고 단정하지 않습니다.
6. 앱에서 온도나 환기 값을 설정하라는 안내는 하지 않습니다.
7. 해결 방법은 차광막, 설치 위치, 주변 공기 흐름, 환기구 및 출입구 정리처럼 현장에서 실행할 수 있는 방법으로 작성합니다.
8. `환기를 확인하세요`처럼 끝내지 않고 무엇을 바꾸고 언제 다시 확인할지 적습니다.
9. 딱딱한 보고서체나 명사형 종결을 피하고 `~해요`, `~해주세요`로 작성합니다.

## 5. Java DTO 예시

```java
public record DoorActivityReportRequest(
    String deviceId,
    LocalDate analysisDate,
    String timezone,
    TrafficSummary trafficSummary,
    GateState latestGateState,
    List<HourlyStat> hourlyStats,
    List<ClimateSample> climateSamples
) {
    public record TrafficSummary(int entered, int exited) {}

    public record HourlyStat(
        LocalTime time,
        int entered,
        int exited,
        GateState gateState,
        Double temperatureC,
        Double humidityPercent
    ) {}

    public record ClimateSample(
        LocalTime time,
        double temperatureC,
        double humidityPercent
    ) {}

    public enum GateState { OPEN, CLOSED, UNKNOWN }
}
```

```java
public record DoorActivityReportResponse(
    Status status,
    String summary,
    List<String> observations,
    Details details,
    List<String> sources,
    OffsetDateTime generatedAt
) {
    public record Details(
        List<MetricRow> overview,
        List<MetricRow> activityAnalysis,
        List<MetricRow> climateAnalysis,
        String hourlyAnalysis,
        List<Solution> solutionGuide
    ) {}

    public record MetricRow(
        String label,
        String value,
        String note,
        Status status
    ) {}

    public record Solution(String title, String description) {}
    public enum Status { GOOD, NORMAL, CAUTION }
}
```

백엔드는 `DoorActivityReportResponse`를 기존 공통 `ApiResponse<T>`의 `data`에 넣어 반환합니다.

## 6. 오류 응답

```json
{
  "code": "AI_REPORT_GENERATION_FAILED",
  "message": "벌 활동 리포트를 만들지 못했어요.",
  "data": null
}
```

- 요청 데이터 오류: HTTP `400`
- 인증 오류: HTTP `401`
- AI 또는 RAG 처리 오류: HTTP `502`
