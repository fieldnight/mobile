import Constants from "expo-constants";
import type { ControlResultEvent } from "../api";

const API_URL =
  Constants.expoConfig?.extra?.apiUrl ??
  Constants.manifest2?.extra?.expoClient?.extra?.apiUrl ??
  "https://webeelab.site";
const RECONNECT_DELAY_MS = 3_000;

export interface HiveTelemetryEvent {
  hiveId: number;
  internalTemperature: number;
  internalHumidity: number;
  externalTemperature: number;
  externalHumidity: number;
  co2: number;
  recordedAt: string;
}

interface SubscribeHiveEventsOptions {
  accessToken: string;
  onControlResult?: (event: ControlResultEvent) => void;
  onTelemetry?: (event: HiveTelemetryEvent) => void;
  onOpen?: () => void;
  onError?: (error: unknown) => void;
}

const subscribers = new Set<SubscribeHiveEventsOptions>();
let activeXhr: XMLHttpRequest | null = null;
let activeAccessToken: string | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function notifyError(error: unknown) {
  subscribers.forEach((subscriber) => subscriber.onError?.(error));
}

function parseTelemetry(rawData: string): HiveTelemetryEvent {
  const parsed = JSON.parse(rawData) as Partial<HiveTelemetryEvent>;
  // co2는 센서 미장착 등의 이유로 null이 내려올 수 있어 필수 검증에서 제외하고 0으로 대체합니다.
  const numericFields = [
    parsed.hiveId,
    parsed.internalTemperature,
    parsed.internalHumidity,
    parsed.externalTemperature,
    parsed.externalHumidity,
  ];

  if (
    numericFields.some(
      (value) => typeof value !== "number" || !Number.isFinite(value),
    ) ||
    (parsed.co2 != null &&
      (typeof parsed.co2 !== "number" || !Number.isFinite(parsed.co2))) ||
    typeof parsed.recordedAt !== "string"
  ) {
    throw new Error("HIVE_TELEMETRY payload 형식이 올바르지 않습니다.");
  }

  return { ...parsed, co2: parsed.co2 ?? 0 } as HiveTelemetryEvent;
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
    pendingLine = normalized.endsWith("\n") ? "" : (lines.pop() ?? "");

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
