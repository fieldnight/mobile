import { NativeModules, Platform } from "react-native";
import type { NfcDoorCardConfig, NfcDoorMode } from "../components/nfcDoorCards";

interface WeBeeHceNativeModule {
  setActiveCard(payload: HceCardPayload): Promise<boolean>;
}

export interface HceCardPayload {
  title: string;
  mode: NfcDoorMode;
  start?: string;
  end?: string;
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
  };
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
