import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, PanResponder, Platform, Pressable, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { PretendardFont } from "@/components/PretendardFont";
import { useAppToast } from "@/components/ToastContext";
import { Card } from "@/components/hive/hive-shared";
import { C } from "@/constants/hive-colors";
import { useHiveControlSettings, useHiveControlSse, useRequestManualControl } from "../hooks";
import type { ControlResultEvent, HiveControlSettingsResponse } from "../api";

const MIN_TEMPERATURE = 16;
const MAX_TEMPERATURE = 36;
const TEMPERATURE_STEP = 0.5;
const THUMB_SIZE = 28;
const RESPONSE_TIMEOUT_MS = 15000;

interface HiveControlSectionProps {
  controlHive: string;
  hiveName?: string;
}

type RequestPhase = "idle" | "sending" | "waiting" | "checking" | "success" | "error";
interface PendingRequest {
  temperature: number;
  accepted: boolean;
  checking: boolean;
  finalCheck: boolean;
  resultReceived: boolean;
}

function getTargetTemperature(settings?: HiveControlSettingsResponse) {
  const value = settings?.controls.find((entry) => entry.type === "TEMPERATURE")?.targetValue;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function clampTemperature(value: number) {
  return Math.max(MIN_TEMPERATURE, Math.min(MAX_TEMPERATURE, Math.round(value / TEMPERATURE_STEP) * TEMPERATURE_STEP));
}

export function HiveControlSection(props: HiveControlSectionProps) {
  // 벌통이 바뀌면 초안, 요청과 응답 대기를 함께 초기화합니다.
  return <HiveTemperatureControl key={props.controlHive} {...props} />;
}

function HiveTemperatureControl({ controlHive, hiveName }: HiveControlSectionProps) {
  const { show: showToast } = useAppToast();
  const { data, isLoading, isError, isFetching, refetch } = useHiveControlSettings(controlHive || undefined);
  const { mutate: mutateManualControl } = useRequestManualControl();
  const [draftTemperature, setDraftTemperature] = useState<number | null>(null);
  const [phase, setPhase] = useState<RequestPhase>("idle");
  const [notice, setNotice] = useState("");
  const requestRef = useRef<PendingRequest | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTemperature = getTargetTemperature(data);
  const targetTemperature = draftTemperature ?? clampTemperature(savedTemperature ?? 25);
  const pending = phase === "sending" || phase === "waiting" || phase === "checking";
  const hasChanges = savedTemperature == null || targetTemperature !== savedTemperature;
  const canEdit = !!controlHive && !!data && !isError && !pending;

  useEffect(() => () => {
    requestRef.current = null;
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const finishRequest = useCallback((request: PendingRequest, nextPhase: "success" | "error", message: string) => {
    if (requestRef.current !== request) return;
    requestRef.current = null;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setPhase(nextPhase);
    setNotice(message);
    if (nextPhase === "success") setDraftTemperature(null);
    showToast(message, nextPhase);
  }, [showToast]);

  const verifySetting = useCallback(async (request: PendingRequest, finalCheck = false) => {
    if (requestRef.current !== request) return;
    request.finalCheck ||= finalCheck;
    if (request.checking) return;
    request.checking = true;
    setPhase("checking");
    try {
      // SSE에는 벌통/요청 ID가 없으므로 현재 벌통의 설정을 다시 읽어 확인합니다.
      // 설정 확인은 실제 장치의 온도 도달이나 하드웨어 동작 완료를 의미하지 않습니다.
      const result = await refetch();
      if (requestRef.current !== request) return;
      if (!result.isError && getTargetTemperature(result.data) === request.temperature) {
        finishRequest(request, "success", `목표 온도 설정이 ${request.temperature.toFixed(1)}°C로 확인됐어요`);
      } else if (request.finalCheck) {
        finishRequest(request, "error", "변경 결과를 확인하지 못했어요. 현재 설정을 확인한 뒤 다시 적용해 주세요.");
      } else {
        setPhase("waiting");
      }
    } catch {
      if (requestRef.current !== request) return;
      if (request.finalCheck) {
        finishRequest(request, "error", "설정을 확인할 수 없어요. 연결 상태를 확인한 뒤 다시 시도해 주세요.");
      } else {
        setPhase("waiting");
      }
    } finally {
      request.checking = false;
    }
  }, [finishRequest, refetch]);

  const handleSseResult = useCallback((event: ControlResultEvent) => {
    const request = requestRef.current;
    if (!request || event.targetTemperature !== request.temperature) return;
    // 다른 벌통의 응답일 수 있어 성공/실패를 직접 확정하지 않습니다.
    request.resultReceived = true;
    if (request.accepted) void verifySetting(request);
  }, [verifySetting]);

  useHiveControlSse({ enabled: !!controlHive, onResult: handleSseResult });

  const changeTemperature = (value: number) => {
    if (!canEdit) return;
    setDraftTemperature(clampTemperature(value));
    setPhase("idle");
    setNotice("");
  };

  const applyTemperature = () => {
    if (!canEdit || !hasChanges || requestRef.current) return;
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const request: PendingRequest = { temperature: targetTemperature, accepted: false, checking: false, finalCheck: false, resultReceived: false };
    requestRef.current = request;
    setPhase("sending");
    setNotice("");
    timerRef.current = setTimeout(() => {
      if (requestRef.current !== request) return;
      if (request.accepted) {
        // 재조회가 지연되거나 자동 재시도 중이어도 조작 화면은 계속 잠기지 않습니다.
        timerRef.current = setTimeout(() => finishRequest(request, "error", "설정 확인이 늦어지고 있어요. 현재 설정을 다시 확인해 주세요."), 10000);
        void verifySetting(request, true);
      }
      else finishRequest(request, "error", "전송 결과를 확인하지 못했어요. 현재 설정을 확인한 뒤 다시 적용해 주세요.");
    }, RESPONSE_TIMEOUT_MS);

    mutateManualControl({ hiveId: controlHive, body: { targetTemperature: request.temperature } }, {
      onSuccess: () => {
        if (requestRef.current !== request) return;
        request.accepted = true;
        setPhase("waiting");
        if (request.resultReceived) void verifySetting(request);
      },
      onError: () => finishRequest(request, "error", "설정 전송에 실패했어요. 연결 상태를 확인한 뒤 다시 적용해 주세요."),
    });
  };

  const pendingLabel = phase === "sending" ? "설정을 전송하고 있어요" : phase === "checking" ? "현재 설정을 확인하고 있어요" : "변경 결과를 기다리고 있어요";

  return (
    <Card style={{ marginHorizontal: -14, backgroundColor: "rgba(255,255,255,0.72)", elevation: 0 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Feather name="thermometer" size={19} color={C.chartTemp} />
        <PretendardFont weight="bold" style={{ fontSize: 18, color: C.text }}>목표 온도 설정</PretendardFont>
      </View>

      {!data && isLoading ? (
        <View style={{ minHeight: 96, alignItems: "center", justifyContent: "center", gap: 12 }} accessibilityLiveRegion="polite">
          <ActivityIndicator color={C.textAlt} />
          <PretendardFont style={{ fontSize: 14, color: C.textAlt }}>현재 설정을 불러오고 있어요</PretendardFont>
        </View>
      ) : !data ? (
        <View style={{ marginTop: 20, gap: 12 }}>
          <PretendardFont style={{ fontSize: 14, lineHeight: 21, color: C.textAlt }}>현재 목표 온도를 불러오지 못했어요.</PretendardFont>
          <Pressable accessibilityRole="button" disabled={isFetching} onPress={() => void refetch()} style={{ minHeight: 44, justifyContent: "center", alignItems: "center", borderRadius: 12, backgroundColor: C.bg }}>
            <PretendardFont weight="semibold" style={{ fontSize: 14, color: C.text }}>{isFetching ? "불러오는 중…" : "다시 불러오기"}</PretendardFont>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <TemperatureStepButton direction="minus" disabled={!canEdit || targetTemperature <= MIN_TEMPERATURE} onPress={() => changeTemperature(targetTemperature - TEMPERATURE_STEP)} />
            <PretendardFont accessibilityLiveRegion="polite" accessibilityLabel={`설정할 목표 온도 ${targetTemperature.toFixed(1)}도`} weight="bold" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ flex: 1, fontSize: 38, color: C.text, textAlign: "center", fontVariant: ["tabular-nums"] }}>
              {targetTemperature.toFixed(1)}<PretendardFont weight="medium" style={{ fontSize: 23, color: C.textAlt }}> °C</PretendardFont>
            </PretendardFont>
            <TemperatureStepButton direction="plus" disabled={!canEdit || targetTemperature >= MAX_TEMPERATURE} onPress={() => changeTemperature(targetTemperature + TEMPERATURE_STEP)} />
          </View>

          <TemperatureSlider value={targetTemperature} disabled={!canEdit} onChange={changeTemperature} />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <PretendardFont style={{ fontSize: 12, color: C.textAlt }}>16°C</PretendardFont>
            <PretendardFont style={{ fontSize: 12, color: C.textAlt }}>0.5°C씩 조절</PretendardFont>
            <PretendardFont style={{ fontSize: 12, color: C.textAlt }}>36°C</PretendardFont>
          </View>
          <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#15803D" }} />
            <PretendardFont style={{ fontSize: 12, color: C.textAlt }}>수정벌 권장 구간 24~27°C</PretendardFont>
          </View>

          {/* 전송 상태나 오류가 있을 때만 안내 공간을 사용합니다. */}
          {(pending || notice || isError) && <View accessibilityLiveRegion="polite" style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 8 }}>
            {pending ? <ActivityIndicator size="small" color={C.textAlt} /> : notice ? <Feather name={phase === "error" ? "alert-circle" : "check-circle"} size={16} color={phase === "error" ? C.error : C.success} /> : null}
            <PretendardFont style={{ flex: 1, fontSize: 13, lineHeight: 20, color: phase === "error" ? C.error : phase === "success" ? C.success : C.textAlt }}>
              {pending ? pendingLabel : notice || "현재 설정을 새로 확인하지 못했어요. 다시 불러온 뒤 적용해 주세요."}
            </PretendardFont>
          </View>}
          {/* 비활성 상태에도 배경과 테두리를 남겨 버튼 영역이 보이도록 합니다. */}
          <Pressable accessibilityRole="button" accessibilityLabel={`${hiveName ?? "선택한 벌통"} 목표 온도 ${targetTemperature.toFixed(1)}도로 적용`} accessibilityState={{ disabled: !canEdit || !hasChanges, busy: pending }} disabled={!canEdit || !hasChanges} onPress={applyTemperature}
            className="active:opacity-80"
            style={{ minHeight: 48, marginTop: 10, borderRadius: 12, alignSelf: "stretch", alignItems: "center", justifyContent: "center", paddingHorizontal: 12, borderWidth: 1, borderColor: !canEdit || !hasChanges ? "#CBD5E1" : "#191F28", backgroundColor: !canEdit || !hasChanges ? "#E2E8F0" : "#191F28" }}>
            <PretendardFont weight="bold" style={{ fontSize: 16, color: !canEdit || !hasChanges ? "#475569" : "#FFFFFF" }}>{pending ? "설정 확인 중…" : `${targetTemperature.toFixed(1)}°C로 적용`}</PretendardFont>
          </Pressable>
          {!pending && (draftTemperature != null || phase === "error" || isError) ? (
            <Pressable accessibilityRole="button" onPress={() => { setDraftTemperature(null); setPhase("idle"); setNotice(""); void refetch(); }} style={{ minHeight: 44, marginTop: 4, alignItems: "center", justifyContent: "center" }}>
              <PretendardFont weight="medium" style={{ fontSize: 13, color: C.textAlt }}>현재 설정 다시 확인</PretendardFont>
            </Pressable>
          ) : null}
        </>
      )}
    </Card>
  );
}

function TemperatureStepButton({ direction, disabled, onPress }: { direction: "minus" | "plus"; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`목표 온도 0.5도 ${direction === "plus" ? "올리기" : "내리기"}`} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 14, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? C.border : C.bgAlt, opacity: disabled ? 0.4 : 1 })}>
      <Feather name={direction} size={21} color={C.text} />
    </Pressable>
  );
}

function TemperatureSlider({ value, disabled, onChange }: { value: number; disabled: boolean; onChange: (value: number) => void }) {
  const [width, setWidth] = useState(200);
  const liveRef = useRef({ value, disabled, onChange });
  liveRef.current = { value, disabled, onChange };
  const startValueRef = useRef(value);
  const travel = Math.max(1, width - THUMB_SIZE);
  const range = MAX_TEMPERATURE - MIN_TEMPERATURE;
  const thumbLeft = ((value - MIN_TEMPERATURE) / range) * travel;

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => !liveRef.current.disabled && Math.abs(gesture.dx) > 6 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
    onPanResponderTerminationRequest: () => true,
    onPanResponderGrant: () => { startValueRef.current = liveRef.current.value; },
    onPanResponderMove: (_, gesture) => {
      if (!liveRef.current.disabled) liveRef.current.onChange(clampTemperature(startValueRef.current + (gesture.dx / travel) * range));
    },
  }), [range, travel]);

  return (
    <View {...panResponder.panHandlers} accessible accessibilityRole="adjustable" accessibilityLabel="목표 온도" accessibilityHint="위아래로 쓸어 0.5도씩 조절한 뒤 적용 버튼을 누르세요" accessibilityState={{ disabled }} accessibilityValue={{ min: MIN_TEMPERATURE, max: MAX_TEMPERATURE, now: value, text: `${value.toFixed(1)}도` }} accessibilityActions={[{ name: "increment", label: "0.5도 올리기" }, { name: "decrement", label: "0.5도 내리기" }]} onAccessibilityAction={(event) => { if (!disabled) onChange(clampTemperature(value + (event.nativeEvent.actionName === "increment" ? TEMPERATURE_STEP : -TEMPERATURE_STEP))); }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ height: 52, marginTop: 10, justifyContent: "center", opacity: disabled ? 0.55 : 1 }}>
      <View style={{ height: 6, marginHorizontal: THUMB_SIZE / 2, borderRadius: 3, backgroundColor: C.border }} />
      <View pointerEvents="none" style={{ position: "absolute", left: THUMB_SIZE / 2, width: thumbLeft, height: 6, borderRadius: 3, backgroundColor: C.primary }} />
      <View pointerEvents="none" style={{ position: "absolute", left: THUMB_SIZE / 2 + ((24 - MIN_TEMPERATURE) / range) * travel, width: (3 / range) * travel, height: 6, borderRadius: 3, backgroundColor: "#15803D" }} />
      <View pointerEvents="none" style={{ position: "absolute", left: thumbLeft, width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: THUMB_SIZE / 2, backgroundColor: C.white, borderWidth: 3, borderColor: C.textAlt }} />
    </View>
  );
}
