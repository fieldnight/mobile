import { DeviceEventEmitter, NativeEventEmitter, NativeModules, Platform } from "react-native";
import type { EmitterSubscription } from "react-native";
import type { NfcDoorCardConfig, NfcDoorMode } from "../components/nfcDoorCards";

const HCE_RESULT_EVENT = "WeBeeHceResult";

interface WeBeeHceNativeModule {
  setActiveCard(payload: HceCardPayload): Promise<boolean>;
}

export interface HceCardPayload {
  title: string;
  mode: NfcDoorMode;
  start?: string;
  end?: string;
  repeat: boolean;
}

export interface HceResultEvent {
  result: string;
  status: "ok" | "error" | "unknown";
  command?: string;
  detail?: string;
}

const WeBeeHceModule = NativeModules.WeBeeHceModule as
  | WeBeeHceNativeModule
  | undefined;

function sanitizeTitle(title: string) {
  return title.replace(/\|/g, " ").trim() || "WeBee";
}

export function toHceCardPayload(card: NfcDoorCardConfig): HceCardPayload {
  return {
    title: sanitizeTitle(card.title),
    mode: card.mode,
    start: card.start ?? "",
    end: card.end ?? "",
    repeat: card.repeat ?? card.mode === "alternate_days",
  };
}

export function parseHceResult(result: string): HceResultEvent {
  const [prefix, command, ...rest] = result.split("|");
  const detail = rest.join("|");

  return {
    result,
    status: prefix === "OK" ? "ok" : prefix === "ERR" ? "error" : "unknown",
    command,
    detail,
  };
}

export function subscribeHceResult(
  listener: (event: HceResultEvent) => void,
): EmitterSubscription {
  console.log("[WeBee HCE] 결과 이벤트 구독 시작");

  const emitter =
    Platform.OS === "android" && WeBeeHceModule
      ? new NativeEventEmitter(WeBeeHceModule as never)
      : DeviceEventEmitter;

  return emitter.addListener(HCE_RESULT_EVENT, (payload: { result?: string }) => {
    const result = payload?.result ?? "";
    const parsed = parseHceResult(result);

    console.log("[WeBee HCE] ESP32 결과 수신", parsed);
    listener(parsed);
  });
}

export async function setActiveHceCard(card: NfcDoorCardConfig) {
  const payload = toHceCardPayload(card);

  console.log("[WeBee HCE] active card 설정 요청", payload);

  if (Platform.OS !== "android") {
    console.warn("[WeBee HCE] Android HCE는 Android에서만 동작함", {
      platform: Platform.OS,
      payload,
    });
    return false;
  }

  if (!WeBeeHceModule?.setActiveCard) {
    console.warn("[WeBee HCE] NativeModules.WeBeeHceModule을 찾을 수 없음", {
      payload,
    });
    return false;
  }

  try {
    await WeBeeHceModule.setActiveCard(payload);
    console.log("[WeBee HCE] active card 설정 완료", payload);
    return true;
  } catch (error) {
    console.error("[WeBee HCE] active card 설정 실패", { payload, error });
    return false;
  }
}
