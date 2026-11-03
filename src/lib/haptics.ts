/**
 * 앱 진동(햅틱) 정책 — 모든 화면은 expo-haptics 대신 이 모듈을 씁니다.
 * - 화면 전환·버튼·온도 조절 어디서도 진동을 쓰지 않기로 해 HAPTICS_ENABLED를 꺼 두었습니다.
 * - 다시 켜야 하면 이 값만 true로 바꾸면 됩니다. 호출부는 expo-haptics와 같은 모양이라 그대로 동작합니다.
 */
import * as ExpoHaptics from "expo-haptics";

const HAPTICS_ENABLED = false;

export const { ImpactFeedbackStyle, NotificationFeedbackType } = ExpoHaptics;

export function impactAsync(style?: ExpoHaptics.ImpactFeedbackStyle) {
  return HAPTICS_ENABLED ? ExpoHaptics.impactAsync(style) : Promise.resolve();
}

export function selectionAsync() {
  return HAPTICS_ENABLED ? ExpoHaptics.selectionAsync() : Promise.resolve();
}

export function notificationAsync(type?: ExpoHaptics.NotificationFeedbackType) {
  return HAPTICS_ENABLED ? ExpoHaptics.notificationAsync(type) : Promise.resolve();
}
