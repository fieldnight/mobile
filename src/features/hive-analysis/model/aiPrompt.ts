import type { PocAnalysis } from "./pocAnalysis";

const STATUS_KO = { pass: "통과", warn: "주의", fail: "실패", info: "참고" } as const;

/**
 * 규칙 기반 점검 결과를 AI 해석 요청문으로 만듭니다.
 * 수치는 앱이 계산한 값만 넘기고, 새 수치를 지어내지 말라고 명시합니다.
 */
export function buildPocPrompt(hiveName: string, analysis: PocAnalysis) {
  const period = `${new Date(analysis.from).toLocaleString("ko-KR")} ~ ${new Date(analysis.to).toLocaleString("ko-KR")}`;
  const stageLines = analysis.stages
    .map((stage) => {
      const checks = stage.checks
        .map((check) => `  - [${STATUS_KO[check.status]}] ${check.title}: ${check.value} (${check.detail})`)
        .join("\n");
      return `${stage.title} — ${STATUS_KO[stage.status]}\n${checks}`;
    })
    .join("\n");
  const protocol = analysis.protocol.map((step) => `- ${step.done ? "완료" : "미완료"} ${step.title}: ${step.evidence}`).join("\n");
  const questions = analysis.questions.map((q) => `- [${q.topic}] ${q.question} (근거: ${q.why})`).join("\n");

  return [
    "너는 펠티어 소자로 벌통 내부를 정온 제어하는 스마트벌통의 하드웨어 PoC를 검토하는 깐깐한 시니어 하드웨어 엔지니어야.",
    "개발자를 칭찬하지 말고, 개발자가 놓쳤을 위험을 찾는 데 집중해. 특히 결로, 고온측 방열 포화, 돌입 전류·전원, H-브리지 극성 전환, 센서 위치·잡음, 장시간 신뢰성(열 사이클), 통신 장애 중 안전, 벌(생물)에 대한 영향을 의심해.",
    "아래는 앱이 10초 간격 텔레메트리로 계산한 점검 결과야. 이 수치만 근거로 쓰고, 없는 수치를 만들지 마.",
    "제어 흐름: 목표 온도 변경 → targetTemperature 반영 → peltierMode·듀티 변화 → 실제 온도 변화.",
    "참고: peltierCoolCurrentA/peltierHeatCurrentA는 암페어가 아니라 IS 핀 ADC 전압(mV)이고, CO2는 센서 미장착이라 항상 null이야.",
    "",
    `벌통: ${hiveName}`,
    `기간: ${period}, 표본 ${analysis.sampleCount}건`,
    `요약: ${analysis.headline}`,
    "",
    stageLines,
    "",
    "PoC 시험 진행:",
    protocol,
    "",
    "앱이 이미 개발자에게 던진 질문:",
    questions,
    "",
    "다음 형식으로 한국어로 답해줘. 각 항목은 짧고 단정하게, 근거 수치를 꼭 붙이고, 전문용어는 처음 한 번 풀어서 써줘.",
    "1. 한 줄 결론",
    "2. 흐름의 어느 단계에서 문제가 시작되는지와 그 근거 수치",
    "3. 하드웨어·펌웨어에서 의심되는 원인 (가능성 높은 순)",
    "4. 다음에 할 시험 1~3개 (무엇을 바꾸고 어떤 값이 나오면 통과인지, 통과 기준을 숫자로)",
    "5. 개발자에게 묻는 날카로운 질문 3~5개 (위 질문과 겹치지 않게, 왜 묻는지 근거 수치와 함께)",
    "6. 이 데이터로는 판단할 수 없어 추가로 재야 할 것 (센서·계측 장비 포함)",
  ].join("\n");
}
