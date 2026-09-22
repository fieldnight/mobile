import Constants from "expo-constants";
import type { ControlResultEvent } from "../api";
import type { HiveTelemetry } from "@/types/hive-telemetry";

const API_URL =
  Constants.expoConfig?.extra?.apiUrl ??
  Constants.manifest2?.extra?.expoClient?.extra?.apiUrl ??
  "https://webeelab.site";
const RECONNECT_DELAY_MS = 3_000;

export interface HiveTelemetryEvent extends HiveTelemetry {
  hiveId: number;
  recordedAt: string;
}

interface SubscribeHiveEventsOptions {
  accessToken: string;
  onControlResult?: (event: ControlResultEvent) => void;
  onTelemetry?: (event: HiveTelemetryEvent) => void;
  onOpen?: () => void;
  onError?: (error: unknown) => void;
  /** 연결이 끊겨 재연결을 시도하기 시작할 때 호출됩니다. */
  onReconnecting?: () => void;
}

function notifyReconnecting() {
  subscribers.forEach((subscriber) => subscriber.onReconnecting?.());
}

const subscribers = new Set<SubscribeHiveEventsOptions>();
let activeXhr: XMLHttpRequest | null = null;
let activeAccessToken: string | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function notifyError(error: unknown) {
  subscribers.forEach((subscriber) => subscriber.onError?.(error));
}

export function parseTelemetry(rawData: string): HiveTelemetryEvent {
  const parsed = JSON.parse(rawData) as Partial<HiveTelemetryEvent>;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("HIVE_TELEMETRY payload 형식이 올바르지 않습니다.");
  }
  const numericFields = [
    parsed.internalTemperature,
    parsed.internalHumidity,
    parsed.externalTemperature,
    parsed.externalHumidity,
    parsed.co2, parsed.peltierDutyPct, parsed.fanHotDutyPct,
    parsed.fanColdDutyPct, parsed.targetTemperature,
    parsed.peltierCoolCurrentA, parsed.peltierHeatCurrentA,
  ];

  if (
    !Number.isSafeInteger(parsed.hiveId) || Number(parsed.hiveId) <= 0 ||
    numericFields.some(
      (value) => value != null && (typeof value !== "number" || !Number.isFinite(value)),
    ) ||
    [parsed.internalSensorValid, parsed.externalSensorValid].some(
      (value) => value != null && typeof value !== "boolean",
    ) ||
    [parsed.peltierMode, parsed.fanState, parsed.hwIssue, parsed.hwIssueTimestamp].some(
      (value) => value != null && typeof value !== "string",
    ) ||
    typeof parsed.recordedAt !== "string" || !Number.isFinite(Date.parse(parsed.recordedAt))
  ) {
    throw new Error("HIVE_TELEMETRY payload 형식이 올바르지 않습니다.");
  }

  return {
    ...parsed,
    internalTemperature: parsed.internalSensorValid === false ? null : parsed.internalTemperature ?? null,
    internalHumidity: parsed.internalSensorValid === false ? null : parsed.internalHumidity ?? null,
    externalTemperature: parsed.externalSensorValid === false ? null : parsed.externalTemperature ?? null,
    externalHumidity: parsed.externalSensorValid === false ? null : parsed.externalHumidity ?? null,
    co2: parsed.co2 ?? null,
  } as HiveTelemetryEvent;
}

function dispatchEvent(eventName: string, rawData: string) {
  try {
    if (eventName === "HIVE_CONTROL_RESULT") {
      const event = JSON.parse(rawData) as ControlResultEvent;
      console.log("[Hive Control SSE] 제어 응답 수신", event);
      subscribers.forEach((subscriber) => subscriber.onControlResult?.(event));
      return;
    }

    if (eventName === "HIVE_TELEMETRY") {
      const event = parseTelemetry(rawData);
      console.log("[Hive Telemetry SSE] 센서 데이터 수신", event);
      subscribers.forEach((subscriber) => subscriber.onTelemetry?.(event));
    }
  } catch (error) {
    console.error(
      `[Hive SSE] ${eventName} 이벤트 파싱 실패 raw=${rawData} error=${String(error)}`,
    );
    notifyError(error);
  }
}

function scheduleReconnect(accessToken: string) {
  if (reconnectTimer || subscribers.size === 0) return;

  notifyReconnecting();

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (subscribers.size > 0 && activeAccessToken === accessToken) {
      startConnection(accessToken);
    }
  }, RECONNECT_DELAY_MS);
}

/** React Native에서 XHR 스트림을 이용해 앱 공용 SSE 연결 하나를 엽니다. */
function startConnection(accessToken: string) {
  const previousXhr = activeXhr;
  activeXhr = null;
  previousXhr?.abort();

  const xhr = new XMLHttpRequest();
  activeXhr = xhr;
  activeAccessToken = accessToken;

  let consumedLength = 0;
  let currentEvent = "";
  let dataLines: string[] = [];
  let pendingLine = "";
  let opened = false;
  let finished = false;

  const flushEvent = () => {
    if (!currentEvent && dataLines.length === 0) return;
    dispatchEvent(currentEvent, dataLines.join("\n"));
    currentEvent = "";
    dataLines = [];
  };

  const consumeChunk = (chunk: string) => {
    const normalized = `${pendingLine}${chunk}`.replace(/\r\n/g, "\n");
    const lines = normalized.split("\n");
    // 마지막 조각은 다음 청크와 합칩니다. 줄 끝과 이벤트 끝(빈 줄)을 구분합니다.
    pendingLine = lines.pop() ?? "";

    lines.forEach((line) => {
      if (line === "") {
        flushEvent();
      } else if (line.startsWith("event:")) {
        currentEvent = line.replace(/^event:\s?/, "").trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.replace(/^data:\s?/, ""));
      }
    });
  };

  const finishWithError = (error: Error) => {
    if (finished || activeXhr !== xhr) return;
    finished = true;
    activeXhr = null;
    console.error("[Hive SSE] 연결 종료", error);
    notifyError(error);
    scheduleReconnect(accessToken);
  };

  xhr.open("GET", `${API_URL}/api/v1/sse/subscribe`);
  xhr.setRequestHeader("Accept", "text/event-stream");
  xhr.setRequestHeader("Cache-Control", "no-cache");
  xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
  // release 빌드에서 OkHttp가 gzip 압축 응답을 요청하면 전체 스트림이 끝날 때까지
  // responseText가 채워지지 않아 SSE 이벤트가 실시간으로 도착하지 않습니다.
  // 압축을 강제로 끄고 평문 스트림을 받도록 요청합니다.
  xhr.setRequestHeader("Accept-Encoding", "identity");

  xhr.onreadystatechange = () => {
    if (activeXhr !== xhr) return;
    const isSuccessStatus = xhr.status >= 200 && xhr.status < 300;

    if (
      !opened &&
      isSuccessStatus &&
      xhr.readyState >= XMLHttpRequest.HEADERS_RECEIVED
    ) {
      opened = true;
      console.log("[Hive SSE] 구독 연결 성공");
      subscribers.forEach((subscriber) => subscriber.onOpen?.());
    }

    if (
      isSuccessStatus &&
      (xhr.readyState === XMLHttpRequest.LOADING ||
        xhr.readyState === XMLHttpRequest.DONE)
    ) {
      const nextChunk = xhr.responseText.slice(consumedLength);
      consumedLength = xhr.responseText.length;
      if (nextChunk) consumeChunk(nextChunk);
    }

    if (xhr.readyState === XMLHttpRequest.DONE) {
      finishWithError(
        new Error(
          isSuccessStatus
            ? "SSE 연결이 종료되어 재연결합니다."
            : `SSE 연결 실패: ${xhr.status}`,
        ),
      );
    }
  };

  xhr.onerror = () => finishWithError(new Error("SSE 네트워크 오류"));

  try {
    xhr.send();
  } catch (error) {
    finishWithError(
      error instanceof Error ? error : new Error("SSE 연결 시작 실패"),
    );
  }
}

/**
 * 여러 화면이 이벤트를 요청해도 실제 네트워크 연결은 하나만 유지합니다.
 * 마지막 구독자가 해제되면 SSE 연결도 닫습니다.
 */
export function subscribeHiveEvents(options: SubscribeHiveEventsOptions) {
  subscribers.add(options);

  if (!activeXhr || activeAccessToken !== options.accessToken) {
    startConnection(options.accessToken);
  }

  return () => {
    subscribers.delete(options);
    if (subscribers.size > 0) return;

    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    const xhr = activeXhr;
    activeXhr = null;
    activeAccessToken = null;
    xhr?.abort();
    console.log("[Hive SSE] 마지막 구독 해제");
  };
}
