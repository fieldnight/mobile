/**
 * 펠티어 정온 제어 PoC 분석
 * 목표 온도 변경 → targetTemperature 반영 → peltierMode·출력 변화 → 실제 온도 변화
 * 이 순서를 텔레메트리(10초 간격)로 단계별로 점검합니다.
 *
 * 펌웨어 기준(현재 플래시): 10초 측정·10초 전송, 냉방·난방 시 펠티어 100%, 작동 중 팬 100%,
 * 측정 전 순환 3초 30%, 정지 후 팬 60초 추가 구동, 목표 16~36°C, 기본 25°C.
 * 제어 히스테리시스(언제 켜고 끄는지)는 사양에 없어 DEFAULT_DEADBAND로 가정합니다.
 */

export type CheckStatus = "pass" | "warn" | "fail" | "info";

export interface TelemetrySample {
  /** 측정 시각(ms) */
  t: number;
  internalTemperature: number | null;
  externalTemperature: number | null;
  internalHumidity: number | null;
  externalHumidity: number | null;
  internalSensorValid: boolean | null;
  externalSensorValid: boolean | null;
  targetTemperature: number | null;
  peltierMode: string | null;
  peltierDutyPct: number | null;
  fanHotDutyPct: number | null;
  fanColdDutyPct: number | null;
  fanState: string | null;
  /** 필드명과 달리 냉방·난방측 IS 핀 ADC 전압(mV) */
  peltierCoolCurrentA: number | null;
  peltierHeatCurrentA: number | null;
  issues: string[];
}

export interface Check {
  id: string;
  title: string;
  status: CheckStatus;
  /** 화면에 크게 보여줄 값 */
  value: string;
  detail: string;
  /** 실패·주의일 때 해볼 일 */
  action?: string;
}

export interface Stage {
  id: "data" | "command" | "actuation" | "thermal";
  title: string;
  summary: string;
  status: CheckStatus;
  checks: Check[];
}

export interface TargetChange {
  t: number;
  from: number;
  to: number;
}

export interface ProtocolStep {
  id: string;
  title: string;
  how: string;
  done: boolean;
  evidence: string;
}

/** 데이터만으로 판단할 수 없어 H/W 개발자에게 확인해야 하는 질문 */
export interface DevQuestion {
  id: string;
  topic: string;
  question: string;
  /** 왜 묻는지(관찰한 근거) */
  why: string;
}

export interface PocAnalysis {
  from: number;
  to: number;
  sampleCount: number;
  stages: Stage[];
  protocol: ProtocolStep[];
  questions: DevQuestion[];
  targetChanges: TargetChange[];
  headline: string;
  /** AI 해석에 넘길 핵심 수치 */
  metrics: Record<string, number | string | null>;
}

export const SAMPLE_INTERVAL_MS = 10_000;
export const DEFAULT_DEADBAND = 0.5;
const TARGET_MIN = 16;
const TARGET_MAX = 36;
const FULL_DUTY = 100;
const POSTRUN_EXPECTED_MS = 60_000;
const IS_RESPONSE_MV = 50;
const SPIKE_C = 0.8; // 10초 사이 이보다 크게 튀면 실제 열 변화보다 측정 잡음일 가능성이 큽니다.
const STUCK_SAMPLES = 30; // 5분 넘게 같은 값이면 센서가 멈췄을 수 있습니다.
const MIN_OFF_MS = 60_000; // 잔열 배출(60초)보다 짧게 쉬고 다시 켜면 짧은 주기 반복입니다.
const CONDENSATION_MARGIN_C = 2; // 내부 이슬점이 내부 온도에 이만큼 가까우면 냉각면 결로 위험이 있습니다.

/** Magnus 근사 이슬점(°C) */
function dewPoint(tempC: number, rh: number) {
  const a = 17.62;
  const b = 243.12;
  const gamma = Math.log(Math.max(rh, 1) / 100) + (a * tempC) / (b + tempC);
  return (b * gamma) / (a - gamma);
}

const MODE = (sample: TelemetrySample) => (sample.peltierMode ?? "").toUpperCase();
const valid = (value: number | null | undefined): value is number => typeof value === "number" && Number.isFinite(value);
const pct = (part: number, total: number) => (total ? Math.round((part / total) * 1000) / 10 : 0);
const fmt = (value: number | null | undefined, digits = 1, unit = "") => (valid(value) ? `${value.toFixed(digits)}${unit}` : "–");
const mean = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null);
const median = (values: number[]) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const worst = (statuses: CheckStatus[]): CheckStatus =>
  statuses.includes("fail") ? "fail" : statuses.includes("warn") ? "warn" : statuses.every((s) => s === "info") ? "info" : "pass";

function hasReading(sample: TelemetrySample) {
  return valid(sample.internalTemperature) || valid(sample.externalTemperature) || sample.peltierMode != null;
}

/** 내부 온도가 신뢰 가능한 표본인지. 센서가 실패를 보고하면 측정값으로 쓰지 않습니다. */
function internalOk(sample: TelemetrySample) {
  return sample.internalSensorValid !== false && valid(sample.internalTemperature);
}

/** 연속된 같은 상태 구간으로 나눕니다. */
function runs<T>(samples: TelemetrySample[], keyOf: (sample: TelemetrySample) => T) {
  const result: { key: T; start: number; end: number; items: TelemetrySample[] }[] = [];
  for (const sample of samples) {
    const key = keyOf(sample);
    const last = result[result.length - 1];
    if (last && last.key === key && sample.t - last.end <= SAMPLE_INTERVAL_MS * 3) {
      last.end = sample.t;
      last.items.push(sample);
    } else {
      result.push({ key, start: sample.t, end: sample.t, items: [sample] });
    }
  }
  return result;
}

/** 최소제곱 기울기(°C/분) */
function slopePerMinute(items: TelemetrySample[]) {
  const points = items.filter(internalOk).map((s) => ({ x: s.t / 60_000, y: s.internalTemperature as number }));
  if (points.length < 4) return null;
  const mx = mean(points.map((p) => p.x)) as number;
  const my = mean(points.map((p) => p.y)) as number;
  const denominator = points.reduce((sum, p) => sum + (p.x - mx) ** 2, 0);
  return denominator ? points.reduce((sum, p) => sum + (p.x - mx) * (p.y - my), 0) / denominator : null;
}

/** 범위 안 기대 출력과 다른 표본 비율을 상태로 바꿉니다. */
function ratioStatus(mismatchPct: number, warnAt: number, failAt: number): CheckStatus {
  return mismatchPct >= failAt ? "fail" : mismatchPct >= warnAt ? "warn" : "pass";
}

export function analyzePoc(input: TelemetrySample[], options: { deadband?: number; from?: number; to?: number } = {}): PocAnalysis {
  const deadband = options.deadband ?? DEFAULT_DEADBAND;
  const samples = [...input].filter(hasReading).sort((a, b) => a.t - b.t);
  const from = options.from ?? samples[0]?.t ?? 0;
  const to = options.to ?? samples[samples.length - 1]?.t ?? from;
  const metrics: PocAnalysis["metrics"] = {};

  // ---- 1단계: 데이터 수집 -------------------------------------------------
  const expected = Math.max(1, Math.floor((to - from) / SAMPLE_INTERVAL_MS) + 1);
  const receivedPct = pct(samples.length, expected);
  let maxGap = 0;
  let gaps = 0;
  for (let i = 1; i < samples.length; i += 1) {
    const gap = samples[i].t - samples[i - 1].t;
    maxGap = Math.max(maxGap, gap);
    if (gap > SAMPLE_INTERVAL_MS * 3) gaps += 1;
  }
  const internalValidPct = pct(samples.filter((s) => s.internalSensorValid !== false && valid(s.internalTemperature)).length, samples.length);
  const externalValidPct = pct(samples.filter((s) => s.externalSensorValid !== false && valid(s.externalTemperature)).length, samples.length);
  const issueCodes = samples.flatMap((s) => s.issues);
  const brownouts = issueCodes.filter((code) => code === "BROWNOUT_RESET").length;
  const sensorFails = issueCodes.filter((code) => code === "SENSOR_READ_FAIL").length;
  // 실제 전송 간격(중앙값)과 이번 플래시에서 추가된 필드가 들어오는지 먼저 봅니다.
  const intervals = samples.slice(1).map((s, i) => s.t - samples[i].t).filter((gap) => gap > 0);
  const medianIntervalSec = intervals.length ? Math.round((median(intervals) as number) / 1000) : null;
  const extendedCount = samples.filter((s) => s.peltierMode != null || valid(s.targetTemperature) || s.fanState != null).length;
  const extendedPct = pct(extendedCount, samples.length);
  Object.assign(metrics, { receivedPct, medianIntervalSec, extendedFieldsPct: extendedPct, maxGapSec: Math.round(maxGap / 1000), gaps, internalValidPct, externalValidPct, brownouts, sensorFails });

  // 센서 신뢰성: 10초 사이 급변(잡음·EMI 의심)과 오래 같은 값(센서 멈춤 의심), 중복 시각
  let spikes = 0;
  let longestSame = 0;
  let sameRun = 1;
  let duplicates = 0;
  for (let i = 1; i < samples.length; i += 1) {
    const a = samples[i - 1];
    const b = samples[i];
    if (b.t === a.t) duplicates += 1;
    if (!internalOk(a) || !internalOk(b) || b.t - a.t > SAMPLE_INTERVAL_MS * 2) { sameRun = 1; continue; }
    const delta = Math.abs((b.internalTemperature as number) - (a.internalTemperature as number));
    if (delta >= SPIKE_C) spikes += 1;
    sameRun = delta === 0 ? sameRun + 1 : 1;
    longestSame = Math.max(longestSame, sameRun);
  }
  const spikePct = pct(spikes, samples.length);
  Object.assign(metrics, { spikes, longestSameSamples: longestSame, duplicateTimestamps: duplicates });

  const dataChecks: Check[] = [
    {
      id: "firmware-fields",
      title: "이번 펌웨어 데이터 수신",
      status: !samples.length ? "info" : extendedPct >= 90 && (medianIntervalSec ?? 99) <= 15 ? "pass" : extendedPct === 0 ? "fail" : "warn",
      value: !samples.length ? "–" : `${medianIntervalSec ?? "–"}초 간격 · 확장 ${extendedPct}%`,
      detail: "이번 플래시는 10초마다 전송하고 펠티어 모드·출력·팬·목표 온도·센서 정상 여부를 함께 보내요. 실제 전송 간격(중앙값)과 이 필드가 채워진 비율이에요.",
      action: !samples.length ? undefined
        : extendedPct === 0 ? "확장 필드가 하나도 없어요. 이 벌통에 이번 펌웨어가 올라갔는지, 백엔드가 확장 필드를 저장하는지 먼저 확인하세요. 이 상태에선 아래 제어 점검 대부분이 '기록 없음'으로 나와요."
        : (medianIntervalSec ?? 99) > 15 ? "전송 간격이 10초보다 길어요. 펌웨어 전송 주기 설정이나 백엔드 집계 간격을 확인하세요." : undefined,
    },
    {
      id: "received",
      title: "10초 전송 수신율",
      status: receivedPct >= 95 ? "pass" : receivedPct >= 80 ? "warn" : "fail",
      value: `${receivedPct}%`,
      detail: `10초 기준 기대 ${expected}건 중 ${samples.length}건 수신. 30초 넘게 끊긴 구간 ${gaps}번, 가장 긴 공백 ${Math.round(maxGap / 1000)}초.`,
      action: receivedPct < 95 ? "Wi-Fi 신호와 MQTT 재연결 로그를 확인하세요. 공백 시각에 재부팅(hwIssue)이 있었는지도 함께 보세요." : undefined,
    },
    {
      id: "internal-sensor",
      title: "내부 센서(SHT20) 정상 측정",
      status: internalValidPct >= 99 ? "pass" : internalValidPct >= 90 ? "warn" : "fail",
      value: `${internalValidPct}%`,
      detail: "internalSensorValid가 false이거나 값이 없는 표본을 제외한 비율이에요. 제어는 내부 온도를 기준으로 하므로 가장 중요해요.",
      action: internalValidPct < 99 ? "내부 센서 배선·커넥터와 I2C 풀업을 점검하세요." : undefined,
    },
    {
      id: "external-sensor",
      title: "기계 센서 정상 측정",
      status: externalValidPct >= 99 ? "pass" : externalValidPct >= 90 ? "warn" : "fail",
      value: `${externalValidPct}%`,
      detail: "기계 온도는 제어에 쓰지 않지만, 벌통·기계 온도차로 펠티어 성능을 평가할 때 필요해요.",
      action: externalValidPct < 99 ? "기계 센서 배선과 설치 위치(직사광선·배기구 근처)를 확인하세요." : undefined,
    },
    {
      id: "hw-issue",
      title: "장치 이상 보고",
      status: brownouts + sensorFails === 0 ? "pass" : brownouts > 0 ? "fail" : "warn",
      value: brownouts + sensorFails === 0 ? "없음" : `${brownouts + sensorFails}건`,
      detail: `BROWNOUT_RESET ${brownouts}건, SENSOR_READ_FAIL ${sensorFails}건.`,
      action: brownouts > 0
        ? "브라운아웃은 펠티어 100% 기동 순간의 전압 강하일 가능성이 커요. 전원 용량, 배선 굵기, 벌크 커패시터를 확인하세요."
        : sensorFails > 0 ? "센서 실패 시 펠티어가 안전 정지했는지 아래 '안전 정지' 항목을 함께 확인하세요." : undefined,
    },
    {
      id: "sensor-noise",
      title: "내부 온도 튐·멈춤",
      status: !samples.length ? "info" : spikePct >= 2 || longestSame >= STUCK_SAMPLES ? "fail" : spikes > 0 ? "warn" : "pass",
      value: !samples.length ? "–" : `튐 ${spikes}번 · 최장 동일값 ${Math.round((longestSame * SAMPLE_INTERVAL_MS) / 60_000)}분`,
      detail: `벌통 공기는 열용량이 있어 10초 만에 ${SPIKE_C}°C 이상 바뀌기 어려워요. 그런 급변은 측정 잡음일 가능성이 크고, 반대로 5분 넘게 소수점까지 같은 값이면 센서가 멈췄을 수 있어요.`,
      action: spikes > 0
        ? "튐이 펠티어·팬이 켜지는 순간과 겹치는지 보세요. 겹치면 PWM 스위칭 잡음이 I2C 선에 실리는 거예요(선 꼬기·풀업 강화·전원 분리). 센서가 냉각 바람을 직접 맞는 위치인지도 확인하세요."
        : longestSame >= STUCK_SAMPLES ? "값이 멈춘 구간이 있어요. I2C 재시도 실패 시 마지막 값을 재전송하는지 펌웨어를 확인하세요. 그렇다면 internalSensorValid를 false로 보내야 해요." : undefined,
    },
    {
      id: "timestamps",
      title: "전송 시각 정합성",
      status: duplicates ? "warn" : "pass",
      value: duplicates ? `중복 ${duplicates}건` : "정상",
      detail: "같은 시각이 두 번 오면 재전송·시계 되돌림·백엔드 중복 저장 중 하나예요. 반응 시간 계산이 틀어질 수 있어요.",
      action: duplicates ? "MQTT QoS 재전송인지, NTP 동기화 직후 시계가 되돌아갔는지 확인하세요." : undefined,
    },
    {
      id: "co2",
      title: "CO₂",
      status: "info",
      value: "미장착",
      detail: "현재 펌웨어는 CO₂를 항상 null로 보내요. 센서 미장착 상태로 기록돼요.",
    },
  ];

  // ---- 2단계: 목표 온도 반영 ---------------------------------------------
  const withTarget = samples.filter((s) => valid(s.targetTemperature));
  const targetChanges: TargetChange[] = [];
  for (let i = 1; i < withTarget.length; i += 1) {
    const prev = withTarget[i - 1].targetTemperature as number;
    const next = withTarget[i].targetTemperature as number;
    if (Math.abs(next - prev) >= 0.05) targetChanges.push({ t: withTarget[i].t, from: prev, to: next });
  }
  const outOfRange = withTarget.filter((s) => (s.targetTemperature as number) < TARGET_MIN || (s.targetTemperature as number) > TARGET_MAX).length;
  const targetPct = pct(withTarget.length, samples.length);
  // 재부팅 직후 목표가 기본값(25°C)으로 돌아갔는지: 이상 보고 시각 직후의 목표를 직전과 비교합니다.
  let resetToDefault = 0;
  samples.forEach((sample, index) => {
    if (!sample.issues.includes("BROWNOUT_RESET")) return;
    const before = [...samples.slice(0, index)].reverse().find((s) => valid(s.targetTemperature))?.targetTemperature;
    const after = samples.slice(index).find((s) => valid(s.targetTemperature))?.targetTemperature;
    if (valid(before) && valid(after) && before !== 25 && after === 25) resetToDefault += 1;
  });
  Object.assign(metrics, { targetReportedPct: targetPct, targetChanges: targetChanges.length, currentTarget: withTarget[withTarget.length - 1]?.targetTemperature ?? null });

  const commandChecks: Check[] = [
    {
      id: "target-reported",
      title: "목표 온도 보고",
      status: targetPct >= 99 ? "pass" : targetPct >= 90 ? "warn" : "fail",
      value: `${targetPct}%`,
      detail: `현재 목표 ${fmt(withTarget[withTarget.length - 1]?.targetTemperature, 1, "°C")}. 매 전송에 targetTemperature가 들어 있어야 앱 설정이 기기에 반영됐는지 확인할 수 있어요.`,
    },
    {
      id: "target-changes",
      title: "기간 중 목표 변경",
      status: targetChanges.length ? "pass" : "info",
      value: targetChanges.length ? `${targetChanges.length}번` : "없음",
      detail: targetChanges.length
        ? targetChanges.slice(-3).map((c) => `${new Date(c.t).toTimeString().slice(0, 5)} ${c.from.toFixed(1)}→${c.to.toFixed(1)}°C`).join(", ")
        : "이 기간엔 목표가 바뀌지 않았어요. 반응 속도를 보려면 앱에서 목표를 2°C쯤 바꾼 뒤 다시 분석하세요.",
    },
    {
      id: "target-range",
      title: "목표 범위(16~36°C) 검증",
      status: outOfRange ? "fail" : "pass",
      value: outOfRange ? `${outOfRange}건 벗어남` : "정상",
      detail: "펌웨어가 범위를 검증하므로 범위를 벗어난 목표가 보고되면 안 돼요.",
      action: outOfRange ? "펌웨어 목표 저장 로직의 범위 검증을 확인하세요." : undefined,
    },
    {
      id: "target-persist",
      title: "재부팅 후 목표 유지",
      status: brownouts === 0 ? "info" : resetToDefault ? "fail" : "pass",
      value: brownouts === 0 ? "재부팅 없음" : resetToDefault ? `${resetToDefault}번 초기화` : "유지됨",
      detail: "전원 재부팅 뒤에도 목표 온도가 유지돼야 해요(이번 플래시의 변경 사항).",
      action: resetToDefault ? "재부팅 후 목표가 기본값 25°C로 돌아갔어요. NVS 저장·복원 순서를 확인하세요." : undefined,
    },
  ];

  // ---- 3단계: 모드·출력 명령 --------------------------------------------
  const controllable = samples.filter((s) => internalOk(s) && valid(s.targetTemperature) && s.peltierMode != null);
  let wrongDirection = 0;
  let idleOutOfBand = 0;
  for (const s of controllable) {
    const error = (s.internalTemperature as number) - (s.targetTemperature as number);
    const mode = MODE(s);
    if ((error < -deadband && mode === "COOL") || (error > deadband && mode === "HEAT")) wrongDirection += 1;
    if (Math.abs(error) > deadband * 2 && mode === "OFF") idleOutOfBand += 1;
  }
  const wrongPct = pct(wrongDirection, controllable.length);
  const idlePct = pct(idleOutOfBand, controllable.length);

  // 목표 변경 후 올바른 방향으로 모드가 바뀌기까지 걸린 시간
  const modeDelays: number[] = [];
  for (const change of targetChanges) {
    const wanted = change.to < change.from ? "COOL" : "HEAT";
    const hit = samples.find((s) => s.t >= change.t && MODE(s) === wanted);
    const before = samples.filter((s) => s.t < change.t).pop();
    if (hit && before && internalOk(before)) {
      const needsAction = wanted === "COOL" ? (before.internalTemperature as number) > change.to + deadband : (before.internalTemperature as number) < change.to - deadband;
      if (needsAction) modeDelays.push((hit.t - change.t) / 1000);
    }
  }

  const active = samples.filter((s) => MODE(s) === "COOL" || MODE(s) === "HEAT");
  const off = samples.filter((s) => MODE(s) === "OFF");
  const dutyMismatch = active.filter((s) => valid(s.peltierDutyPct) && s.peltierDutyPct !== FULL_DUTY).length + off.filter((s) => valid(s.peltierDutyPct) && s.peltierDutyPct !== 0).length;
  const dutyPct = pct(dutyMismatch, active.length + off.length);

  const fanActive = samples.filter((s) => s.fanState === "ACTIVE");
  const fanMismatch = fanActive.filter((s) => (valid(s.fanHotDutyPct) && s.fanHotDutyPct !== FULL_DUTY) || (valid(s.fanColdDutyPct) && s.fanColdDutyPct !== FULL_DUTY)).length
    + active.filter((s) => s.fanState != null && s.fanState !== "ACTIVE").length;
  const fanPct = pct(fanMismatch, Math.max(fanActive.length, active.length));

  const postruns = runs(samples, (s) => s.fanState === "POSTRUN").filter((r) => r.key);
  const postrunDurations = postruns.map((r) => r.end - r.start + SAMPLE_INTERVAL_MS);
  const postrunMedian = median(postrunDurations);
  // 펠티어가 꺼진 직후 POSTRUN이 따라왔는지
  const stops = runs(samples, (s) => MODE(s) === "COOL" || MODE(s) === "HEAT").filter((r) => r.key);
  const stopsFollowed = stops.filter((r) => samples.some((s) => s.t > r.end && s.t <= r.end + 30_000 && s.fanState === "POSTRUN")).length;

  // 센서 실패 시 안전 정지
  const failSamples = samples.filter((s) => s.internalSensorValid === false);
  const unsafe = failSamples.filter((s) => MODE(s) === "COOL" || MODE(s) === "HEAT").length;

  // IS 전압 반응(전류 감지 배선)
  const coolOn = samples.filter((s) => MODE(s) === "COOL").map((s) => s.peltierCoolCurrentA).filter(valid);
  const coolOff = off.map((s) => s.peltierCoolCurrentA).filter(valid);
  const heatOn = samples.filter((s) => MODE(s) === "HEAT").map((s) => s.peltierHeatCurrentA).filter(valid);
  const heatOff = off.map((s) => s.peltierHeatCurrentA).filter(valid);
  const coolDelta = coolOn.length && coolOff.length ? (mean(coolOn) as number) - (mean(coolOff) as number) : null;
  const heatDelta = heatOn.length && heatOff.length ? (mean(heatOn) as number) - (mean(heatOff) as number) : null;

  const modeShare = {
    COOL: pct(samples.filter((s) => MODE(s) === "COOL").length, samples.length),
    HEAT: pct(samples.filter((s) => MODE(s) === "HEAT").length, samples.length),
    OFF: pct(off.length, samples.length),
  };
  const hours = Math.max((to - from) / 3_600_000, 1 / 60);
  const switches = runs(samples, MODE).length - 1;
  const switchesPerHour = Math.round((Math.max(0, switches) / hours) * 10) / 10;
  Object.assign(metrics, {
    wrongDirectionPct: wrongPct, offOutOfBandPct: idlePct, modeResponseSecMedian: median(modeDelays),
    dutyMismatchPct: dutyPct, fanMismatchPct: fanPct, postrunSecMedian: postrunMedian == null ? null : Math.round(postrunMedian / 1000),
    coolSharePct: modeShare.COOL, heatSharePct: modeShare.HEAT, offSharePct: modeShare.OFF, modeSwitchesPerHour: switchesPerHour,
    coolIsDeltaMv: coolDelta == null ? null : Math.round(coolDelta), heatIsDeltaMv: heatDelta == null ? null : Math.round(heatDelta),
  });

  const isStatus = (delta: number | null): CheckStatus => (delta == null ? "info" : Math.abs(delta) >= IS_RESPONSE_MV ? "pass" : "fail");

  // 모드 구간 단위로 본 위험 신호
  const modeRuns = runs(samples, MODE);
  let polarityFlips = 0;
  let shortOffs = 0;
  let maxActiveMs = 0;
  modeRuns.forEach((run, index) => {
    if (run.key === "COOL" || run.key === "HEAT") maxActiveMs = Math.max(maxActiveMs, run.end - run.start + SAMPLE_INTERVAL_MS);
    const next = modeRuns[index + 1];
    if (!next) return;
    if ((run.key === "COOL" && next.key === "HEAT") || (run.key === "HEAT" && next.key === "COOL")) polarityFlips += 1;
    const prev = modeRuns[index - 1];
    if (run.key === "OFF" && prev && next && (prev.key === "COOL" || prev.key === "HEAT") && (next.key === "COOL" || next.key === "HEAT")
      && next.start - prev.end < MIN_OFF_MS) shortOffs += 1;
  });
  const startTimes = modeRuns.filter((run, index) => (run.key === "COOL" || run.key === "HEAT") && modeRuns[index - 1]?.key === "OFF").map((run) => run.start);
  const brownoutTimes = samples.filter((s) => s.issues.includes("BROWNOUT_RESET")).map((s) => s.t);
  const brownoutAfterStart = brownoutTimes.filter((t) => startTimes.some((start) => t >= start && t - start <= 60_000)).length;
  const offIs = off.flatMap((s) => [s.peltierCoolCurrentA, s.peltierHeatCurrentA]).filter(valid);
  const offIsMean = mean(offIs);
  // 긴 작동 구간에서 IS 전압이 처음 1분 대비 마지막 1분에 얼마나 변했는지(드라이버 발열·전원 처짐)
  const isDrifts = modeRuns
    .filter((run) => (run.key === "COOL" || run.key === "HEAT") && run.end - run.start >= 5 * 60_000)
    .map((run) => {
      const pick = (s: TelemetrySample) => (run.key === "COOL" ? s.peltierCoolCurrentA : s.peltierHeatCurrentA);
      const head = mean(run.items.filter((s) => s.t - run.start <= 60_000).map(pick).filter(valid));
      const tail = mean(run.items.filter((s) => run.end - s.t <= 60_000).map(pick).filter(valid));
      return head && tail != null ? ((tail - head) / head) * 100 : null;
    })
    .filter(valid);
  const isDrift = isDrifts.length ? Math.max(...isDrifts.map(Math.abs)) : null;
  const duties = new Set(samples.map((s) => s.peltierDutyPct).filter(valid));
  const bangBang = duties.size > 0 && [...duties].every((d) => d === 0 || d === FULL_DUTY);
  Object.assign(metrics, {
    polarityFlips, shortOffCycles: shortOffs, brownoutAfterStart, maxActiveMin: Math.round(maxActiveMs / 60_000),
    offIsMeanMv: offIsMean == null ? null : Math.round(offIsMean), isDriftPctMax: isDrift == null ? null : Math.round(isDrift),
  });

  const actuationChecks: Check[] = [
    {
      id: "mode-direction",
      title: "냉방·난방 방향 선택",
      status: controllable.length ? ratioStatus(wrongPct, 1, 5) : "info",
      value: controllable.length ? `오선택 ${wrongPct}%` : "데이터 없음",
      detail: `내부가 목표보다 ${deadband}°C 넘게 높은데 HEAT, 낮은데 COOL인 표본 비율. 목표에서 ${deadband * 2}°C 넘게 벗어났는데 OFF인 비율은 ${idlePct}%.`,
      action: wrongPct >= 1 ? "제어 로직의 오차 부호(내부−목표)와 COOL/HEAT 매핑, H-브리지 방향 핀을 확인하세요." : idlePct >= 10 ? "목표에서 크게 벗어났는데 꺼져 있는 시간이 길어요. 히스테리시스·최소 정지 시간 설정을 확인하세요." : undefined,
    },
    {
      id: "mode-response",
      title: "목표 변경 후 모드 전환",
      status: modeDelays.length ? ((median(modeDelays) as number) <= 30 ? "pass" : (median(modeDelays) as number) <= 120 ? "warn" : "fail") : "info",
      value: modeDelays.length ? `${Math.round(median(modeDelays) as number)}초` : "변경 없음",
      detail: "목표가 바뀐 표본부터 올바른 방향(COOL/HEAT)이 처음 보고되기까지 걸린 시간(중앙값)이에요. 10초 전송 주기만큼 오차가 있어요.",
    },
    {
      id: "peltier-duty",
      title: "펠티어 출력 지시값",
      status: active.length + off.length ? ratioStatus(dutyPct, 1, 5) : "info",
      value: active.length + off.length ? `불일치 ${dutyPct}%` : "데이터 없음",
      detail: "현재 펌웨어 기준 COOL·HEAT일 때 100%, OFF일 때 0%여야 해요.",
      action: dutyPct >= 1 ? "PWM 지시값과 모드가 어긋나요. 모드 전환 시점에 PWM을 갱신하는 순서를 확인하세요." : undefined,
    },
    {
      id: "fan",
      title: "팬 동작(작동 중 100%)",
      status: fanActive.length || active.length ? ratioStatus(fanPct, 2, 10) : "info",
      value: fanActive.length || active.length ? `불일치 ${fanPct}%` : "데이터 없음",
      detail: "펠티어 작동 중엔 fanState가 ACTIVE이고 두 팬 모두 100%여야 해요. 측정 전 순환(3초 30%)은 10초 전송에 거의 잡히지 않아요.",
      action: fanPct >= 2 ? "펠티어가 켜졌는데 팬이 ACTIVE가 아닌 표본이 있어요. 고온측 팬이 멈추면 펠티어가 과열될 수 있으니 우선 확인하세요." : undefined,
    },
    {
      id: "postrun",
      title: "정지 후 잔열 배출(60초)",
      status: stops.length === 0 ? "info" : postrunMedian == null ? "fail" : Math.abs(postrunMedian - POSTRUN_EXPECTED_MS) <= 20_000 && stopsFollowed === stops.length ? "pass" : "warn",
      value: postrunMedian == null ? (stops.length ? "없음" : "정지 없음") : `${Math.round(postrunMedian / 1000)}초`,
      detail: `펠티어 정지 ${stops.length}번 중 ${stopsFollowed}번 뒤에 POSTRUN이 이어졌어요.`,
      action: stops.length && stopsFollowed < stops.length ? "정지 직후 POSTRUN으로 넘어가지 않은 경우가 있어요. 팬 상태 전이를 확인하세요." : undefined,
    },
    {
      id: "safe-stop",
      title: "센서 실패 시 안전 정지",
      status: failSamples.length === 0 ? "info" : unsafe ? "fail" : "pass",
      value: failSamples.length === 0 ? "실패 없음" : unsafe ? `${unsafe}건 작동` : "정지함",
      detail: "내부 센서가 실패하면 펠티어는 OFF여야 해요. 센서 커넥터를 잠깐 빼서 직접 시험할 수 있어요.",
      action: unsafe ? "센서 실패 중에도 펠티어가 작동했어요. 안전 정지 조건을 가장 먼저 고쳐야 해요." : undefined,
    },
    {
      id: "is-cool",
      title: "냉방측 IS 전압 반응",
      status: isStatus(coolDelta),
      value: coolDelta == null ? "데이터 없음" : `${Math.round(coolDelta)} mV`,
      detail: `냉방 중 평균 − 정지 중 평균. ${IS_RESPONSE_MV} mV 이상 차이 나면 전류 감지 배선과 ADC가 반응한다고 봐요. 값은 암페어가 아니라 IS 핀 전압이에요.`,
      action: coolDelta != null && Math.abs(coolDelta) < IS_RESPONSE_MV ? "냉방 중에도 IS 전압이 그대로예요. IS 핀 배선, 분압 저항, ADC 채널 설정을 확인하세요." : undefined,
    },
    {
      id: "is-heat",
      title: "난방측 IS 전압 반응",
      status: isStatus(heatDelta),
      value: heatDelta == null ? "데이터 없음" : `${Math.round(heatDelta)} mV`,
      detail: "난방 중 평균 − 정지 중 평균이에요.",
      action: heatDelta != null && Math.abs(heatDelta) < IS_RESPONSE_MV ? "난방 중에도 IS 전압이 그대로예요. 난방측 IS 배선을 확인하세요." : undefined,
    },
    {
      id: "polarity-flip",
      title: "냉방↔난방 직접 전환",
      status: polarityFlips ? "fail" : modeShare.COOL && modeShare.HEAT ? "pass" : "info",
      value: polarityFlips ? `${polarityFlips}번` : "없음",
      detail: "COOL에서 OFF를 거치지 않고 바로 HEAT로(또는 반대로) 바뀐 횟수예요. H-브리지 방향을 곧바로 뒤집으면 순간 단락(슛스루)과 펠티어 열충격 위험이 있어요.",
      action: polarityFlips ? "방향 전환 사이에 데드타임과 최소 정지 시간을 두세요. 펠티어 수명은 극성·온도 사이클 횟수에 크게 좌우돼요." : undefined,
    },
    {
      id: "short-cycle",
      title: "짧은 주기 반복",
      status: shortOffs ? "warn" : stops.length ? "pass" : "info",
      value: shortOffs ? `${shortOffs}번` : "없음",
      detail: "꺼진 지 60초(잔열 배출 시간)가 지나기 전에 다시 켜진 횟수예요. 잔열이 남은 채 재기동하면 효율이 떨어지고 고온측 온도가 계속 쌓여요.",
      action: shortOffs ? "최소 정지 시간을 잔열 배출 시간 이상으로 잡거나 히스테리시스 폭을 넓혀 보세요." : undefined,
    },
    {
      id: "inrush",
      title: "기동 직후 브라운아웃",
      status: brownoutAfterStart ? "fail" : brownouts ? "warn" : "info",
      value: brownoutAfterStart ? `${brownoutAfterStart}번` : brownouts ? "기동과 무관" : "재부팅 없음",
      detail: "펠티어가 켜진 뒤 60초 안에 BROWNOUT_RESET이 보고된 횟수예요. 펠티어 100% 기동의 돌입 전류가 MCU 전원까지 끌어내렸다는 강한 신호예요.",
      action: brownoutAfterStart ? "펠티어 기동을 소프트 스타트(PWM 램프)로 바꾸고, MCU 전원을 펠티어 전원과 분리하거나 LDO 앞에 벌크 커패시터를 두세요." : undefined,
    },
    {
      id: "is-offset",
      title: "정지 중 IS 전압(오프셋)",
      status: offIsMean == null ? "info" : offIsMean > 100 ? "warn" : "pass",
      value: offIsMean == null ? "데이터 없음" : `${Math.round(offIsMean)} mV`,
      detail: "펠티어가 꺼져 있을 때의 IS 전압이에요. 0에 가까워야 해요. 높으면 드라이버 누설, 접지 루프, ADC 기준전압 오차를 의심해요.",
      action: offIsMean != null && offIsMean > 100 ? "정지 중 IS 핀을 멀티미터로 재고 펌웨어 값과 비교해 오프셋을 보정하세요." : undefined,
    },
    {
      id: "is-drift",
      title: "장시간 작동 중 IS 변화",
      status: isDrift == null ? "info" : isDrift > 15 ? "warn" : "pass",
      value: isDrift == null ? "5분 이상 작동 없음" : `${Math.round(isDrift)}%`,
      detail: "5분 넘게 이어진 작동 구간에서 처음 1분과 마지막 1분 IS 전압 차이예요. 크게 변하면 드라이버·펠티어 발열이나 전원 처짐이에요.",
      action: isDrift != null && isDrift > 15 ? "같은 구간에 고온측 방열판 온도를 함께 재 보세요. 발열로 저항이 바뀌는 거라면 방열 설계가 한계에 가까운 거예요." : undefined,
    },
    {
      id: "control-style",
      title: "제어 방식",
      status: "info",
      value: bangBang ? "켜고 끄기(0/100%)" : "출력 조절",
      detail: bangBang
        ? "출력이 0% 아니면 100%예요. 단순하고 튼튼하지만 목표 근처에서 오버슈트와 잦은 전환이 생기기 쉽고, 펠티어는 낮은 출력에서 효율(COP)이 훨씬 좋아요."
        : "출력을 단계적으로 조절하고 있어요.",
    },
    {
      id: "chatter",
      title: "모드 전환 빈도",
      status: switchesPerHour <= 12 ? "pass" : switchesPerHour <= 30 ? "warn" : "fail",
      value: `시간당 ${switchesPerHour}번`,
      detail: `냉방 ${modeShare.COOL}% · 난방 ${modeShare.HEAT}% · 정지 ${modeShare.OFF}%. 너무 잦은 전환은 펠티어 수명과 전원에 부담이 돼요.`,
      action: switchesPerHour > 12 ? "켜고 끄기가 잦아요. 히스테리시스 폭이나 최소 작동·정지 시간을 늘려 보세요." : undefined,
    },
  ];

  // ---- 4단계: 실제 온도 변화 --------------------------------------------
  const coolSlopes = stops.filter((r) => r.items.every((s) => MODE(s) === "COOL") && r.items.length >= 6).map((r) => slopePerMinute(r.items)).filter(valid);
  const heatSlopes = stops.filter((r) => r.items.every((s) => MODE(s) === "HEAT") && r.items.length >= 6).map((r) => slopePerMinute(r.items)).filter(valid);
  const coolSlope = median(coolSlopes);
  const heatSlope = median(heatSlopes);

  // 목표 변경 후 도달 시간과 오버슈트
  const settle: number[] = [];
  const overshoots: number[] = [];
  targetChanges.forEach((change, index) => {
    const until = targetChanges[index + 1]?.t ?? to;
    const window = samples.filter((s) => s.t >= change.t && s.t < until && internalOk(s));
    const reached = window.find((s) => Math.abs((s.internalTemperature as number) - change.to) <= deadband);
    if (!reached) return;
    settle.push((reached.t - change.t) / 60_000);
    const after = window.filter((s) => s.t >= reached.t).map((s) => (s.internalTemperature as number) - change.to);
    const over = change.to < change.from ? -Math.min(0, ...after) : Math.max(0, ...after);
    overshoots.push(over);
  });

  // 유지 성능: 목표 근처에 들어온 뒤의 오차
  const tracked = controllable.map((s) => Math.abs((s.internalTemperature as number) - (s.targetTemperature as number)));
  const within05 = pct(tracked.filter((e) => e <= 0.5).length, tracked.length);
  const within10 = pct(tracked.filter((e) => e <= 1.0).length, tracked.length);
  const mae = mean(tracked);
  const comfort = pct(samples.filter((s) => internalOk(s) && (s.internalTemperature as number) >= 24 && (s.internalTemperature as number) <= 27).length, samples.filter(internalOk).length);

  // 기계 대비 내부 온도차(냉방이면 기계보다 얼마나 낮췄는지)
  const coolDiff = mean(samples.filter((s) => MODE(s) === "COOL" && internalOk(s) && valid(s.externalTemperature)).map((s) => (s.externalTemperature as number) - (s.internalTemperature as number)));
  const heatDiff = mean(samples.filter((s) => MODE(s) === "HEAT" && internalOk(s) && valid(s.externalTemperature)).map((s) => (s.internalTemperature as number) - (s.externalTemperature as number)));

  // 냉각 포화: 10분 넘는 냉방 구간에서 앞 1/3보다 뒤 1/3의 하강 속도가 크게 줄었는데 아직 목표 위에 있으면 방열 한계예요.
  const saturated = stops
    .filter((run) => run.items.every((s) => MODE(s) === "COOL") && run.end - run.start >= 10 * 60_000)
    .filter((run) => {
      const third = Math.floor(run.items.length / 3);
      const first = slopePerMinute(run.items.slice(0, third));
      const last = slopePerMinute(run.items.slice(-third));
      const tail = run.items[run.items.length - 1];
      const stillAbove = internalOk(tail) && valid(tail.targetTemperature) && (tail.internalTemperature as number) > (tail.targetTemperature as number) + deadband;
      return first != null && last != null && first < 0 && last > first * 0.3 && stillAbove;
    }).length;

  // 결로 위험: 냉방 중 내부 공기 이슬점이 내부 온도에 가까우면, 그보다 차가운 냉각면에는 물이 맺혀요.
  const coolHumid = samples.filter((s) => MODE(s) === "COOL" && internalOk(s) && valid(s.internalHumidity));
  const condensationRisk = coolHumid.filter((s) => (s.internalTemperature as number) - dewPoint(s.internalTemperature as number, s.internalHumidity as number) <= CONDENSATION_MARGIN_C).length;
  const condensationPct = pct(condensationRisk, coolHumid.length);
  const minDewGap = coolHumid.length
    ? Math.min(...coolHumid.map((s) => (s.internalTemperature as number) - dewPoint(s.internalTemperature as number, s.internalHumidity as number)))
    : null;

  // 목표가 설정 범위 끝이면 일반 운전이 아니라 한계 시험이에요.
  const extremeTarget = withTarget.some((s) => s.targetTemperature === TARGET_MIN || s.targetTemperature === TARGET_MAX);

  Object.assign(metrics, {
    saturatedCoolRuns: saturated, condensationRiskPct: condensationPct, minDewGapC: minDewGap == null ? null : Math.round(minDewGap * 10) / 10,
    extremeTarget: extremeTarget ? "yes" : "no",
  });
  Object.assign(metrics, {
    coolSlopeCPerMin: coolSlope == null ? null : Math.round(coolSlope * 100) / 100,
    heatSlopeCPerMin: heatSlope == null ? null : Math.round(heatSlope * 100) / 100,
    settleMinMedian: median(settle) == null ? null : Math.round((median(settle) as number) * 10) / 10,
    overshootCMax: overshoots.length ? Math.round(Math.max(...overshoots) * 10) / 10 : null,
    trackingMaeC: mae == null ? null : Math.round(mae * 100) / 100,
    within05Pct: within05, within10Pct: within10, comfortPct: comfort,
    coolBelowAmbientC: coolDiff == null ? null : Math.round(coolDiff * 10) / 10,
    heatAboveAmbientC: heatDiff == null ? null : Math.round(heatDiff * 10) / 10,
  });

  const thermalChecks: Check[] = [
    {
      id: "cool-slope",
      title: "냉방 중 온도 변화",
      status: coolSlope == null ? "info" : coolSlope < -0.02 ? "pass" : coolSlope < 0 ? "warn" : "fail",
      value: coolSlope == null ? "냉방 구간 없음" : `${coolSlope.toFixed(2)}°C/분`,
      detail: "1분 이상 이어진 냉방 구간에서 내부 온도의 기울기(중앙값)예요. 음수여야 실제로 식고 있는 거예요.",
      action: coolSlope != null && coolSlope >= 0 ? "냉방 중인데 온도가 내려가지 않아요. 펠티어 극성, 냉각면 접촉(써멀패드), 고온측 방열을 확인하세요." : undefined,
    },
    {
      id: "heat-slope",
      title: "난방 중 온도 변화",
      status: heatSlope == null ? "info" : heatSlope > 0.02 ? "pass" : heatSlope > 0 ? "warn" : "fail",
      value: heatSlope == null ? "난방 구간 없음" : `+${heatSlope.toFixed(2)}°C/분`,
      detail: "1분 이상 이어진 난방 구간의 기울기예요. 양수여야 해요.",
      action: heatSlope != null && heatSlope <= 0 ? "난방 중인데 온도가 오르지 않아요. H-브리지 역방향 구동과 단열을 확인하세요." : undefined,
    },
    {
      id: "settle",
      title: "목표 도달 시간",
      status: settle.length ? ((median(settle) as number) <= 30 ? "pass" : (median(settle) as number) <= 60 ? "warn" : "fail") : targetChanges.length ? "fail" : "info",
      value: settle.length ? `${(median(settle) as number).toFixed(1)}분` : targetChanges.length ? "미도달" : "변경 없음",
      detail: `목표 변경 후 내부 온도가 목표 ±${deadband}°C 안에 처음 들어오기까지 걸린 시간이에요.`,
      action: targetChanges.length && !settle.length ? "기간 안에 목표에 닿지 못했어요. 기계 온도와의 차이가 펠티어 용량을 넘는지(아래 벌통·기계 온도차) 확인하세요." : undefined,
    },
    {
      id: "overshoot",
      title: "오버슈트",
      status: overshoots.length ? (Math.max(...overshoots) <= 0.5 ? "pass" : Math.max(...overshoots) <= 1.0 ? "warn" : "fail") : "info",
      value: overshoots.length ? `${Math.max(...overshoots).toFixed(1)}°C` : "–",
      detail: "목표에 닿은 뒤 반대쪽으로 넘어간 최대 폭이에요. 정지 후 잔열 배출 중에도 냉각·가열이 조금 이어질 수 있어요.",
    },
    {
      id: "tracking",
      title: "목표 유지 오차",
      status: !tracked.length ? "info" : within10 >= 90 ? "pass" : within10 >= 70 ? "warn" : "fail",
      value: mae == null ? "–" : `평균 ${mae.toFixed(2)}°C`,
      detail: `목표 ±0.5°C 안 ${within05}%, ±1.0°C 안 ${within10}%. 수정벌 권장 24~27°C 안 ${comfort}%.`,
    },
    {
      id: "saturation",
      title: "냉각 포화(방열 한계)",
      status: saturated ? "warn" : coolSlopes.length ? "pass" : "info",
      value: saturated ? `${saturated}구간` : coolSlopes.length ? "없음" : "긴 냉방 없음",
      detail: "10분 넘게 냉방하는 동안 뒤쪽 하강 속도가 앞쪽의 30% 아래로 떨어졌는데 아직 목표에 못 닿은 구간이에요. 고온측 방열이 한계에 오면 펠티어는 같은 전류로도 덜 식혀요.",
      action: saturated ? "고온측 방열판 온도(가능하면 센서 추가), 팬 풍량, 써멀 그리스 상태를 확인하세요. 외기 온도가 높은 낮 시간대에 반복되는지도 보세요." : undefined,
    },
    {
      id: "condensation",
      title: "냉각면 결로 위험",
      status: !coolHumid.length ? "info" : condensationPct >= 20 ? "fail" : condensationPct > 0 ? "warn" : "pass",
      value: !coolHumid.length ? "냉방 없음" : `위험 ${condensationPct}% · 최소 여유 ${fmt(minDewGap, 1, "°C")}`,
      detail: `냉방 중 내부 공기의 이슬점이 내부 온도보다 ${CONDENSATION_MARGIN_C}°C 안쪽으로 가까웠던 비율이에요. 냉각면은 내부 공기보다 훨씬 차가우니 실제로는 이미 물이 맺히고 있을 수 있어요. 벌통 안 물기는 곰팡이·벌 폐사, 회로 부식으로 이어져요.`,
      action: condensationPct > 0 ? "냉각면 아래 물받이·배수 경로를 확인하고, 습도가 높을 땐 목표를 너무 낮게 잡지 않거나 냉각 출력을 낮추는 제한을 검토하세요." : undefined,
    },
    {
      id: "target-extreme",
      title: "목표 온도 범위 끝 사용",
      status: extremeTarget ? "warn" : withTarget.length ? "pass" : "info",
      value: extremeTarget ? "16°C 또는 36°C" : "일반 범위",
      detail: "목표가 설정 범위 끝이면 기기는 쉬지 않고 최대 출력으로 달려요. 수정벌 권장(24~27°C)과도 멀어서 실제 운전이 아니라 한계 시험으로 봐야 해요.",
      action: extremeTarget ? "의도한 한계 시험이면 연속 작동 시간·고온측 온도·결로를 함께 기록하세요. 의도가 아니라면 앱 기본값과 범위를 다시 확인하세요." : undefined,
    },
    {
      id: "ambient",
      title: "기계 대비 온도차",
      status: "info",
      value: `냉방 ${fmt(coolDiff, 1, "°C")} · 난방 ${fmt(heatDiff, 1, "°C")}`,
      detail: "냉방 중엔 기계보다 얼마나 낮게, 난방 중엔 얼마나 높게 유지했는지예요. 기계 조건이 다른 날끼리 펠티어 용량을 비교할 때 써요.",
    },
  ];

  const stages: Stage[] = [
    { id: "data", title: "데이터 수집", summary: "10초 전송·센서·이상 보고가 믿을 만한가", checks: dataChecks, status: worst(dataChecks.map((c) => c.status)) },
    { id: "command", title: "목표 온도 반영", summary: "앱에서 바꾼 목표가 기기에 저장·보고되는가", checks: commandChecks, status: worst(commandChecks.map((c) => c.status)) },
    { id: "actuation", title: "모드·출력 변화", summary: "목표와 내부 온도에 맞게 펠티어·팬이 움직이는가", checks: actuationChecks, status: worst(actuationChecks.map((c) => c.status)) },
    { id: "thermal", title: "실제 온도 변화", summary: "그 결과 내부 온도가 목표로 가고 유지되는가", checks: thermalChecks, status: worst(thermalChecks.map((c) => c.status)) },
  ];

  const coolStep = targetChanges.some((c) => c.to < c.from) && coolSlopes.length > 0;
  const heatStep = targetChanges.some((c) => c.to > c.from) && heatSlopes.length > 0;
  const protocol: ProtocolStep[] = [
    { id: "baseline", title: "기준 기록 1시간", how: "목표를 바꾸지 않고 1시간 기록해 수신율·센서 상태를 확인해요.", done: (to - from) >= 50 * 60_000 && receivedPct >= 95, evidence: `수신율 ${receivedPct}%` },
    { id: "cool-step", title: "냉방 스텝 시험", how: "목표를 현재 내부 온도보다 2°C 낮게 바꾸고 COOL·100%·팬 ACTIVE·온도 하강을 확인해요.", done: coolStep, evidence: coolStep ? `냉방 기울기 ${fmt(coolSlope, 2, "°C/분")}` : "기간 안에 목표를 낮춘 기록이 없어요" },
    { id: "heat-step", title: "난방 스텝 시험", how: "목표를 내부 온도보다 2°C 높게 바꾸고 HEAT 전환과 온도 상승을 확인해요.", done: heatStep, evidence: heatStep ? `난방 기울기 ${fmt(heatSlope, 2, "°C/분")}` : "기간 안에 목표를 높인 기록이 없어요" },
    { id: "hold", title: "목표 유지 1시간", how: "목표에 도달한 뒤 1시간 동안 ±0.5°C 안에 머무는 비율과 모드 전환 빈도를 봐요.", done: settle.length > 0 && within05 >= 80, evidence: `±0.5°C 안 ${within05}%` },
    { id: "fault", title: "장애 시험", how: "내부 센서 커넥터 분리(안전 정지·SENSOR_READ_FAIL), 전원 재부팅(목표 유지·원인 보고), 공유기 재시작(자동 재연결)을 차례로 해요.", done: failSamples.length > 0 || brownouts > 0, evidence: failSamples.length || brownouts ? `센서 실패 ${failSamples.length}건, 재부팅 ${brownouts}건 기록` : "아직 장애 상황 기록이 없어요" },
  ];

  // 데이터만으로 판정할 수 없는 부분은 질문으로 남깁니다. 관찰한 근거가 있는 질문을 앞에 둡니다.
  const questions: DevQuestion[] = [];
  const ask = (id: string, topic: string, question: string, why: string) => questions.push({ id, topic, question, why });
  if (extremeTarget) ask("extreme", "시험 의도", "목표를 16°C(또는 36°C)로 둔 건 의도한 한계 시험인가요? 연속 작동 시간 제한이나 고온측 과열 보호가 있나요?", `기간 중 목표가 범위 끝이었고, 최장 연속 작동이 ${Math.round(maxActiveMs / 60_000)}분이에요.`);
  if (coolHumid.length) ask("condensate", "결로", "냉각면에 맺힌 물은 어디로 빠지나요? 벌통 안으로 떨어지거나 보드 쪽으로 흐를 경로는 없나요?", minDewGap != null ? `냉방 중 이슬점까지 최소 여유가 ${minDewGap.toFixed(1)}°C였어요.` : "냉방 구간이 있어요.");
  if (maxActiveMs >= 10 * 60_000 || saturated) ask("hot-side", "방열", "고온측 방열판 온도를 재는 센서가 있나요? 없으면 냉각 포화와 과열을 데이터로 구분할 수 없어요.", `최장 연속 작동 ${Math.round(maxActiveMs / 60_000)}분, 포화 의심 ${saturated}구간.`);
  if (coolOn.length || heatOn.length) ask("is-scale", "전류 감지", "IS 전압(mV)을 암페어로 바꾸는 환산식(감지 저항·분압비·드라이버 IS 비율)은 무엇인가요? 정격 전류 대비 몇 %로 돌고 있는지 알 수 있어요.", `냉방 중 IS 평균 ${fmt(mean(coolOn), 0, " mV")}.`);
  if (brownouts || coolOn.length) ask("psu", "전원", "어댑터 정격 전류와 펠티어·팬 최대 전류의 합은 각각 얼마인가요? 기동 순간 돌입 전류를 측정해 봤나요?", brownouts ? `BROWNOUT_RESET이 ${brownouts}번 있었어요.` : "펠티어가 100%로 켜지는 구간이 있어요.");
  if ((modeShare.COOL && modeShare.HEAT) || polarityFlips) ask("dead-time", "H-브리지", "냉방↔난방 전환 시 데드타임과 최소 정지 시간은 몇 초인가요?", polarityFlips ? `직접 전환이 ${polarityFlips}번 있었어요.` : "같은 기간에 냉방과 난방이 모두 있었어요.");
  if (spikes) ask("sensor-placement", "센서 위치", "내부 SHT20이 냉각 바람이 직접 닿는 곳에 있나요? 벌이 모이는 위치와 거리는요?", `10초 사이 ${SPIKE_C}°C 이상 튄 값이 ${spikes}번 있었어요.`);
  ask("hysteresis", "제어 기준", "켜고 끄는 히스테리시스 폭과 최소 작동·정지 시간은 몇으로 설정돼 있나요?", `사양에 없어 분석은 ±${deadband}°C로 가정했어요. 실제 값을 알면 판정이 정확해져요.`);
  ask("offline", "통신 장애", "Wi-Fi·MQTT가 끊긴 동안에도 기기는 마지막 목표 온도로 계속 제어하나요? 그동안의 기록은 버퍼링했다가 다시 보내나요?", "통신 공백 중에는 제어가 됐는지 데이터로 확인할 수 없어요.");
  ask("airflow", "측정 전 순환", "측정 전 3초 30% 순환이 센서 주변 공기를 충분히 섞나요? 순환 없이 잰 값과 비교해 본 적이 있나요?", "3초 순환은 10초 전송에 거의 잡히지 않아 효과를 데이터로 볼 수 없어요.");

  const firstProblem = stages.find((s) => s.status === "fail") ?? stages.find((s) => s.status === "warn");
  const headline = !samples.length
    ? "분석할 기록이 없어요"
    : firstProblem
      ? `${firstProblem.title} 단계부터 확인이 필요해요`
      : protocol.every((p) => p.done)
        ? "모든 단계를 통과했어요. PoC 기준을 충족해요"
        : `지금까지 기록은 정상이에요. 다음은 '${protocol.find((p) => !p.done)?.title}'`;

  return { from, to, sampleCount: samples.length, stages, protocol, questions, targetChanges, headline, metrics };
}
