import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, AppState, PanResponder, Platform, type GestureResponderEvent } from "react-native";
import * as Haptics from "expo-haptics";
import type { DataPoint, HiveSensorDataKey } from "@/types";
import { initialViewport, latestSensorIndex } from "../model/chartModel";
import { createChartInteraction, type ChartInteractionSnapshot } from "../model/chartInteraction";

export function useChartInteraction({ data, keys, width, height, paddingX, paddingY, onInteractionChange }: {
  data: DataPoint[]; keys: HiveSensorDataKey[]; width: number; height: number;
  paddingX: number; paddingY: number; onInteractionChange?: (active: boolean) => void;
}) {
  const [snapshot, setSnapshot] = useState<ChartInteractionSnapshot>(() => ({
    viewport: initialViewport(data, keys), selectedIndex: latestSensorIndex(data, keys), mode: "idle",
  }));
  const reducedMotion = useRef(false);
  const current = useRef({ data, keys, width, height, paddingX, paddingY, onInteractionChange });
  current.current = { data, keys, width, height, paddingX, paddingY, onInteractionChange };
  const [controller] = useState(() => createChartInteraction({
    options: () => ({ ...current.current, reducedMotion: reducedMotion.current }),
    render: setSnapshot,
    interaction: (active) => current.current.onInteractionChange?.(active),
    haptic: () => {
      if (Platform.OS !== "web") void Haptics.selectionAsync().catch(() => {});
    },
    now: () => performance.now(),
    requestFrame: (callback) => requestAnimationFrame(callback),
    cancelFrame: cancelAnimationFrame,
    setTimer: (callback, delay) => setTimeout(callback, delay),
    clearTimer: clearTimeout,
  }));
  const [responder] = useState(() => {
    const touches = (event: GestureResponderEvent) => {
      const { paddingX: px, paddingY: py } = current.current;
      return Array.from(event.nativeEvent.touches ?? []).map((touch) => ({ x: touch.locationX - px, y: touch.locationY - py }));
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event) => controller.start(touches(event)),
      onPanResponderStart: (event) => controller.start(touches(event)),
      onPanResponderMove: (event) => controller.move(touches(event)),
      onPanResponderEnd: (event) => {
        const remaining = touches(event);
        if (remaining.length) controller.move(remaining);
      },
      onPanResponderRelease: controller.end,
      onPanResponderTerminate: controller.cancel,
    });
  });
  useEffect(() => {
    controller.resume();
    controller.syncData();
    return () => controller.dispose();
  }, [controller, data, keys]);
  useEffect(() => {
    controller.cancel();
  }, [controller, width, height]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") controller.cancel();
    });
    return () => subscription.remove();
  }, [controller]);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) reducedMotion.current = enabled;
    }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (enabled) => { reducedMotion.current = enabled; });
    return () => { mounted = false; subscription.remove(); };
  }, []);
  return { ...snapshot, panHandlers: responder.panHandlers, resetView: controller.reset, zoom: controller.zoom, cancel: controller.cancel };
}
