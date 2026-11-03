import { ActivityIndicator, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { PretendardFont } from "@/components/PretendardFont";
import { Tap } from "@/components/Tap";
import { MAX_TEMPERATURE, MIN_TEMPERATURE, type useTargetTemperature } from "../hooks/useTargetTemperature";
import { R, T } from "../theme";

type TargetControl = ReturnType<typeof useTargetTemperature>;

const PENDING_LABEL = {
  sending: "벌통으로 보내고 있어요",
  waiting: "벌통의 응답을 기다리고 있어요",
  checking: "바뀐 설정을 확인하고 있어요",
} as const;

/**
 * 리모컨 패널 — 목표 온도를 0.5°C씩 올리고 내린 뒤 적용합니다.
 */
export function RemotePanel({ hiveName, control }: { hiveName: string; control: TargetControl }) {
  const { settings, saved, target, phase, notice, pending, hasChanges, canEdit, dirty } = control;

  if (!settings.data) {
    return (
      <View style={{ backgroundColor: T.panel, borderRadius: R.panel, padding: 20, minHeight: 150, justifyContent: "center", alignItems: "center", gap: 12 }}>
        {settings.isLoading ? (
          <>
            <ActivityIndicator color={T.inkSoft} />
            <PretendardFont style={{ fontSize: 14, color: T.inkSoft }}>목표 온도를 불러오고 있어요</PretendardFont>
          </>
        ) : (
          <>
            <PretendardFont style={{ fontSize: 14, color: T.inkSoft }}>목표 온도를 불러오지 못했어요</PretendardFont>
            <Tap
              accessibilityRole="button"
              disabled={settings.isFetching}
              onPress={() => void settings.refetch()}
              style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 20, justifyContent: "center", borderRadius: R.key, backgroundColor: pressed ? T.keyPressed : T.key })}
            >
              <PretendardFont weight="semibold" style={{ fontSize: 14, color: T.ink }}>
                {settings.isFetching ? "불러오는 중…" : "다시 불러오기"}
              </PretendardFont>
            </Tap>
          </>
        )}
      </View>
    );
  }

  const applyDisabled = !canEdit || !hasChanges;
  const statusText = pending ? PENDING_LABEL[phase as keyof typeof PENDING_LABEL] : notice;

  return (
    <View style={{ backgroundColor: T.panel, borderRadius: R.panel, padding: 20 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <PretendardFont weight="bold" style={{ fontSize: 16, color: T.ink }}>목표 온도</PretendardFont>
        <PretendardFont style={{ fontSize: 12.5, color: T.muted }}>
          {saved != null ? `지금 설정 ${saved.toFixed(1)}°C` : "설정 없음"}
        </PretendardFont>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 14, gap: 12 }}>
        <StepKey direction="minus" disabled={!canEdit || target <= MIN_TEMPERATURE} onPress={() => control.step(-1)} />
        <View style={{ flex: 1, alignItems: "center" }}>
          <PretendardFont
            accessibilityLiveRegion="polite"
            accessibilityLabel={`설정할 목표 온도 ${target.toFixed(1)}도`}
            weight="semibold"
            style={{ fontSize: 40, letterSpacing: -1.2, color: dirty ? T.brand : T.ink, fontVariant: ["tabular-nums"] }}
          >
            {target.toFixed(1)}
            <PretendardFont weight="medium" style={{ fontSize: 18, color: T.muted }}> °C</PretendardFont>
          </PretendardFont>
          <PretendardFont style={{ fontSize: 12, color: T.muted }}>
            {MIN_TEMPERATURE}~{MAX_TEMPERATURE}°C · 권장 24~27°C
          </PretendardFont>
        </View>
        <StepKey direction="plus" disabled={!canEdit || target >= MAX_TEMPERATURE} onPress={() => control.step(1)} />
      </View>

      <Tap
        accessibilityRole="button"
        accessibilityLabel={`${hiveName} 목표 온도 ${target.toFixed(1)}도로 적용`}
        accessibilityState={{ disabled: applyDisabled, busy: pending }}
        disabled={applyDisabled}
        onPress={control.apply}
        style={({ pressed }) => ({
          marginTop: 18,
          minHeight: 52,
          borderRadius: R.key,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: applyDisabled ? T.key : pressed ? "#333B45" : T.ink,
        })}
      >
        <PretendardFont weight="bold" style={{ fontSize: 16, color: applyDisabled ? T.muted : T.panel }}>
          {pending ? "적용하는 중…" : hasChanges ? `${target.toFixed(1)}°C로 적용` : "지금 설정과 같아요"}
        </PretendardFont>
      </Tap>

      {statusText ? (
        <View accessibilityLiveRegion="polite" style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
          {pending ? (
            <ActivityIndicator size="small" color={T.inkSoft} />
          ) : (
            <Feather name={phase === "error" ? "alert-circle" : "check-circle"} size={15} color={phase === "error" ? T.hot : T.good} />
          )}
          <PretendardFont style={{ flex: 1, fontSize: 13, lineHeight: 19, color: phase === "error" ? T.hot : phase === "success" ? T.good : T.inkSoft }}>
            {statusText}
          </PretendardFont>
        </View>
      ) : null}

      {!pending && (dirty || phase === "error") ? (
        <Tap accessibilityRole="button" onPress={control.reset} style={{ minHeight: 44, marginTop: 4, alignItems: "center", justifyContent: "center" }}>
          <PretendardFont weight="medium" style={{ fontSize: 13, color: T.inkSoft }}>지금 설정으로 되돌리기</PretendardFont>
        </Tap>
      ) : null}
    </View>
  );
}

function StepKey({ direction, disabled, onPress }: { direction: "minus" | "plus"; disabled: boolean; onPress: () => void }) {
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={`목표 온도 0.5도 ${direction === "plus" ? "올리기" : "내리기"}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pressed ? T.keyPressed : T.key,
        opacity: disabled ? 0.4 : 1,
      })}
    >
      <Feather name={direction} size={24} color={T.ink} />
    </Tap>
  );
}
