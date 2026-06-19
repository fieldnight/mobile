import Constants from "expo-constants";
import type { ControlResultEvent } from "../api";

const API_URL =
  Constants.expoConfig?.extra?.apiUrl ?? Constants.manifest2?.extra?.expoClient?.extra?.apiUrl ?? "https://webeelab.site";

interface SubscribeHiveControlResultOptions {
  accessToken: string | null;
  onResult: (event: ControlResultEvent) => void;
  onOpen?: () => void;
  onError?: (error: unknown) => void;
}

/**
 * React Native에는 브라우저 EventSource가 기본 제공되지 않아 XHR 스트리밍으로 SSE를 읽습니다.
 * 서버가 보내는 event/data 줄을 직접 파싱하고, 제어 결과 이벤트만 화면 쪽으로 전달합니다.
 */
export function subscribeHiveControlResult({
  accessToken,
  onResult,
  onOpen,
  onError,
}: SubscribeHiveControlResultOptions) {
  const xhr = new XMLHttpRequest();
  let consumedLength = 0;
  let currentEvent = "";
  let dataLines: string[] = [];
  let pendingLine = "";
  let opened = false;

  const flushEvent = () => {
    if (!currentEvent && dataLines.length === 0) return;

    if (currentEvent === "HIVE_CONTROL_RESULT") {
      try {
        const parsed = JSON.parse(dataLines.join("\n")) as ControlResultEvent;
        console.log("[Hive Control SSE] 제어 응답 수신", parsed);
        onResult(parsed);
      } catch (error) {
        console.error("[Hive Control SSE] 제어 응답 파싱 실패", {
          raw: dataLines.join("\n"),
          error,
        });
        onError?.(error);
      }
    }

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
        return;
      }

      if (line.startsWith("event:")) {
        currentEvent = line.replace(/^event:\s?/, "").trim();
        return;
      }

      if (line.startsWith("data:")) {
        dataLines.push(line.replace(/^data:\s?/, ""));
      }
    });
  };

  xhr.open("GET", `${API_URL}/api/v1/sse/subscribe`);
  xhr.setRequestHeader("Accept", "text/event-stream");
  xhr.setRequestHeader("Cache-Control", "no-cache");
  if (accessToken) {
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
  }

  xhr.onreadystatechange = () => {
    if (!opened && xhr.readyState >= XMLHttpRequest.HEADERS_RECEIVED) {
      opened = true;
      console.log("[Hive Control SSE] 구독 연결 성공");
      onOpen?.();
    }

    if (
      xhr.readyState === XMLHttpRequest.LOADING ||
      xhr.readyState === XMLHttpRequest.DONE
    ) {
      const nextChunk = xhr.responseText.slice(consumedLength);
      consumedLength = xhr.responseText.length;
      if (nextChunk) consumeChunk(nextChunk);
    }

    if (xhr.readyState === XMLHttpRequest.DONE && xhr.status >= 400) {
      const error = new Error(`SSE 연결 실패: ${xhr.status}`);
      console.error("[Hive Control SSE] 구독 연결 실패", error);
      onError?.(error);
    }
  };

  xhr.onerror = () => {
    const error = new Error("SSE 네트워크 오류");
    console.error("[Hive Control SSE] 네트워크 오류", error);
    onError?.(error);
  };

  xhr.send();

  return () => {
    console.log("[Hive Control SSE] 구독 해제");
    xhr.abort();
  };
}
