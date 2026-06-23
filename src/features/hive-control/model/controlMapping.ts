import type { HiveControlState } from "@/types/hive-control";
import type {
  ControlResultEvent,
  HiveControlSettingsResponse,
  HiveControlType,
} from "../api";

export type QuickControlKey = "heaterOn" | "coolerOn" | "ventOn" | "circOn";

/**
 * 기존 화면 id와 서버 enum을 연결합니다.
 * 서버 명세에 아직 없는 쿨러/순환은 일부러 제외해 로컬 fallback으로만 처리합니다.
 */
export const AUTO_CONTROL_TYPE_BY_ID: Record<string, HiveControlType> = {
  heating: "TEMPERATURE",
  humidity: "HUMIDITY",
  ventilation: "FAN",
};

export const AUTO_CONTROL_ID_BY_TYPE: Partial<Record<HiveControlType, string>> = {
  TEMPERATURE: "heating",
  HUMIDITY: "humidity",
  FAN: "ventilation",
};

export const MANUAL_CONTROL_TYPE_BY_KEY: Partial<
  Record<QuickControlKey, HiveControlType>
> = {
  heaterOn: "HEATER",
  ventOn: "FAN",
};

/**
 * 자동 제어를 켜면 관련 수동 버튼은 비활성 상태로 내려야 합니다.
 * 화면과 서버 응답을 같은 규칙으로 맞추기 위해 별도 함수로 분리했습니다.
 */
export function getManualResetsByAutoId(
  id: string,
): Partial<HiveControlState> {
  if (id === "heating") {
    return { heaterOn: false, coolerOn: false };
  }
  if (id === "humidity" || id === "ventilation") {
    return { ventOn: false, circOn: false };
  }
  return {};
}

/** 자동 제어 버튼을 누른 직후 보여줄 낙관적 UI 상태를 만듭니다. */
export function buildOptimisticAutoState(
  prev: HiveControlState,
  controlId: string,
): HiveControlState {
  return {
    ...prev,
    ...getManualResetsByAutoId(controlId),
    controls: prev.controls.map((control) =>
      control.id === controlId
        ? { ...control, enabled: !control.enabled }
        : control,
    ),
  };
}

/** 수동 빠른 제어 버튼을 누른 직후 보여줄 낙관적 UI 상태를 만듭니다. */
export function buildOptimisticManualState(
  prev: HiveControlState,
  key: QuickControlKey,
): HiveControlState {
  const newValue = !prev[key];
  const updates: Partial<HiveControlState> = { [key]: newValue };

  if (key === "heaterOn" && newValue) updates.coolerOn = false;
  if (key === "coolerOn" && newValue) updates.heaterOn = false;
  if (key === "ventOn" && newValue) updates.circOn = false;
  if (key === "circOn" && newValue) updates.ventOn = false;

  return { ...prev, ...updates };
}

/**
 * 서버 제어 설정을 기존 화면 상태 구조로 병합합니다.
 * 백엔드에 없는 쿨러/순환 상태는 기존 로컬 값을 유지해 UI가 갑자기 사라지지 않게 합니다.
 */
export function mergeControlSettings(
  prev: HiveControlState,
  settings: HiveControlSettingsResponse,
  pendingAutoTypes: ReadonlySet<HiveControlType> = new Set(),
  pendingManualTypes: ReadonlySet<HiveControlType> = new Set(),
): HiveControlState {
  const nextControls = prev.controls.map((control) => {
    const serverType = AUTO_CONTROL_TYPE_BY_ID[control.id];
    // 자동 제어 명령은 SSE 결과가 최종값이라, 대기 중인 타입은 늦게 온 조회 응답으로 덮지 않는다.
    if (serverType && pendingAutoTypes.has(serverType)) return control;

    const serverSetting = settings.auto.find((item) => item.type === serverType);
    return serverSetting ? { ...control, enabled: serverSetting.enabled } : control;
  });

  const heater = settings.manual.find((item) => item.type === "HEATER");
  const fan = settings.manual.find((item) => item.type === "FAN");
  const heaterOn = pendingManualTypes.has("HEATER")
    ? prev.heaterOn
    : (heater?.isOn ?? prev.heaterOn);
  const ventOn = pendingManualTypes.has("FAN")
    ? prev.ventOn
    : (fan?.isOn ?? prev.ventOn);

  return {
    ...prev,
    controls: nextControls,
    heaterOn,
    ventOn,
  };
}

/** SSE 제어 결과를 화면 상태에 반영합니다. 실패 이벤트는 여기서 상태를 바꾸지 않습니다. */
export function applyControlResult(
  prev: HiveControlState,
  event: ControlResultEvent,
): HiveControlState {
  if (!event.success) return prev;

  const autoId = AUTO_CONTROL_ID_BY_TYPE[event.type];
  const nextControls =
    autoId && event.autoEnabled !== null
      ? prev.controls.map((control) =>
          control.id === autoId
            ? { ...control, enabled: event.autoEnabled! }
            : control,
        )
      : prev.controls;

  return {
    ...prev,
    controls: nextControls,
    heaterOn: event.type === "HEATER" && event.isOn !== null ? event.isOn : prev.heaterOn,
    ventOn: event.type === "FAN" && event.isOn !== null ? event.isOn : prev.ventOn,
  };
}
