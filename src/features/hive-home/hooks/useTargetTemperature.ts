import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as Haptics from "@/lib/haptics";
import { useAppToast } from "@/components/ToastContext";
import {
  useHiveControlSettings,
  useHiveControlSse,
  useRequestManualControl,
  type ControlResultEvent,
  type HiveControlSettingsResponse,
} from "@/features/hive-control";

export const MIN_TEMPERATURE = 16;
export const MAX_TEMPERATURE = 36;
export const TEMPERATURE_STEP = 0.5;
// 서버의 명령 보관 시간은 30초이므로 그 안에 도착한 응답을 놓치지 않습니다.
const RESPONSE_TIMEOUT_MS = 35000;

export type TargetPhase = "idle" | "sending" | "waiting" | "checking" | "success" | "error";

interface PendingRequest {
  temperature: number;
  accepted: boolean;
  checking: boolean;
  finalCheck: boolean;
  resultReceived: boolean;
}

export function getTargetTemperature(settings?: HiveControlSettingsResponse) {
  const value = settings?.controls.find((entry) => entry.type === "TEMPERATURE")?.targetValue;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function clampTemperature(value: number) {
  return Math.max(
    MIN_TEMPERATURE,
    Math.min(MAX_TEMPERATURE, Math.round(value / TEMPERATURE_STEP) * TEMPERATURE_STEP),
  );
}

/**
 * 리모컨 패널의 목표 온도 조작 상태.
 * 기존 스마트벌통 제어(HiveControlSection)와 같은 전송 → SSE 결과 → 설정 재조회 확인 흐름을 따릅니다.
 * 벌통이 바뀌면 호출 컴포넌트를 key로 다시 마운트해 초안과 대기 상태를 비웁니다.
 */
export function useTargetTemperature(hiveId: string) {
  const { show: showToast } = useAppToast();
  const settings = useHiveControlSettings(hiveId || undefined);
  const { data, isError, refetch } = settings;
  const { mutate: mutateManualControl } = useRequestManualControl();
  const [draft, setDraft] = useState<number | null>(null);
  const [phase, setPhase] = useState<TargetPhase>("idle");
  const [notice, setNotice] = useState("");
  const requestRef = useRef<PendingRequest | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saved = getTargetTemperature(data);
  const target = draft ?? clampTemperature(saved ?? 25);
  const pending = phase === "sending" || phase === "waiting" || phase === "checking";
  const hasChanges = saved == null || target !== saved;
  const canEdit = !!hiveId && !!data && !isError && !pending;

  // 다이얼 드래그·버튼 꾹 누르기처럼 렌더 사이에 연달아 호출돼도 최신 값에서 계산하도록 ref로 들고 있습니다.
  const latestRef = useRef({ target, saved, canEdit });
  latestRef.current = { target, saved, canEdit };

  useEffect(() => () => {
    requestRef.current = null;
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const finish = useCallback((request: PendingRequest, next: "success" | "error", message: string) => {
    if (requestRef.current !== request) return;
    requestRef.current = null;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setPhase(next);
    setNotice(message);
    if (next === "success") setDraft(null);
    showToast(message, next);
  }, [showToast]);

  const verify = useCallback(async (request: PendingRequest, finalCheck = false) => {
    if (requestRef.current !== request) return;
    request.finalCheck ||= finalCheck;
    if (request.checking) return;
    request.checking = true;
    setPhase("checking");
    try {
      // POST 응답에 commandId가 없으므로 설정을 다시 읽어 반영 여부를 확인합니다.
      const result = await refetch();
      if (requestRef.current !== request) return;
      if (!result.isError && getTargetTemperature(result.data) === request.temperature) {
        finish(request, "success", `목표 온도가 ${request.temperature.toFixed(1)}°C로 바뀌었어요`);
      } else if (request.finalCheck) {
        finish(request, "error", "변경 결과를 확인하지 못했어요. 현재 설정을 확인한 뒤 다시 적용해 주세요.");
      } else {
        setPhase("waiting");
      }
    } catch {
      if (requestRef.current !== request) return;
      if (request.finalCheck) {
        finish(request, "error", "설정을 확인할 수 없어요. 연결 상태를 확인한 뒤 다시 시도해 주세요.");
      } else {
        setPhase("waiting");
      }
    } finally {
      request.checking = false;
    }
  }, [finish, refetch]);

  const handleSseResult = useCallback((event: ControlResultEvent) => {
    const request = requestRef.current;
    if (!request || String(event.hiveId) !== hiveId) return;
    if (!event.success) {
      finish(request, "error", event.message || "벌통에서 설정을 적용하지 못했어요.");
      return;
    }
    if (event.targetTemperature !== request.temperature) return;
    request.resultReceived = true;
    if (request.accepted) void verify(request);
  }, [hiveId, finish, verify]);

  // 적용 결과를 기다리는 동안에만 실시간 연결을 엽니다.
  useHiveControlSse({ enabled: !!hiveId && pending, onResult: handleSseResult });

  /**
   * 목표 온도 초안을 바꾸고 실제로 바뀌었는지 돌려줍니다.
   * 지금 설정값으로 돌아오면 초안을 비워 취소/확인을 닫습니다.
   */
  const setTarget = useCallback((value: number) => {
    const latest = latestRef.current;
    if (!latest.canEdit) return false;
    const next = clampTemperature(value);
    if (next === latest.target) return false;
    latest.target = next;
    setDraft(next === latest.saved ? null : next);
    setPhase("idle");
    setNotice("");
    return true;
  }, []);

  /** −/+ 버튼용. 다이얼과 마찬가지로 진동 없이 0.5°C씩 바꿉니다. */
  const step = useCallback((direction: 1 | -1) => {
    setTarget(latestRef.current.target + direction * TEMPERATURE_STEP);
  }, [setTarget]);

  const apply = () => {
    if (!canEdit || !hasChanges || requestRef.current) return;
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const request: PendingRequest = {
      temperature: target,
      accepted: false,
      checking: false,
      finalCheck: false,
      resultReceived: false,
    };
    requestRef.current = request;
    setPhase("sending");
    setNotice("");
    timerRef.current = setTimeout(() => {
      if (requestRef.current !== request) return;
      if (request.accepted) {
        timerRef.current = setTimeout(
          () => finish(request, "error", "설정 확인이 늦어지고 있어요. 현재 설정을 다시 확인해 주세요."),
          10000,
        );
        void verify(request, true);
      } else {
        finish(request, "error", "전송 결과를 확인하지 못했어요. 현재 설정을 확인한 뒤 다시 적용해 주세요.");
      }
    }, RESPONSE_TIMEOUT_MS);

    mutateManualControl({ hiveId, body: { targetTemperature: request.temperature } }, {
      onSuccess: () => {
        if (requestRef.current !== request) return;
        request.accepted = true;
        setPhase("waiting");
        if (request.resultReceived) void verify(request);
      },
      onError: () =>
        finish(request, "error", "설정 전송에 실패했어요. 연결 상태를 확인한 뒤 다시 적용해 주세요."),
    });
  };

  const reset = () => {
    setDraft(null);
    setPhase("idle");
    setNotice("");
    void refetch();
  };

  return {
    settings,
    saved,
    target,
    phase,
    notice,
    pending,
    hasChanges,
    canEdit,
    dirty: draft != null,
    step,
    setTarget,
    apply,
    reset,
  };
}
