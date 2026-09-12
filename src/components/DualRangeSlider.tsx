/**
 * 가로 트랙 위에 원형 핸들로 구간을 지정하는 공용 range slider.
 * - 트랙은 기본적으로 "비활성"(error) 색으로 깔리고, 활성 구간만 "활성"(primary) 색으로
 *   강조됩니다. 시간 구간(0~24시)과 벌 마릿수 구간(0~상한) 양쪽에서 재사용해요.
 * - 드래그는 PanResponder로 처리합니다(react-native-gesture-handler 의존성 없음).
 *
 * DualRangeSlider: 핸들 2개로 구간(low~high)을 지정합니다. (여닫기, 시간 구간 설정, 기준 마릿수)
 * SingleRangeSlider: 핸들 1개로 기준점 하나를 지정하고, 그 앞/뒤 중 한쪽만 활성으로 표시합니다.
 *   (열기 예약: 기준점 이후가 활성 / 닫기 예약: 기준점 이전이 활성)
 *
 * PanResponder는 컴포넌트가 살아있는 동안 딱 한 번만 만들고(useRef), 최신 min/max/step/
 * trackWidth/low/high/onChange는 ref로 계속 최신화해 콜백 안에서 읽습니다. 드래그 도중
 * onChange로 값이 바뀔 때마다 PanResponder를 새로 만들면(예전에 useMemo(..., [low, high])로
 * 만들었던 방식) RN이 진행 중이던 제스처 추적을 놓쳐 핸들이 저 혼자 왔다갔다 튀는
 * 버그가 있었습니다 — 인스턴스를 고정해서 그 문제를 없앱니다.
 */
import { useMemo, useRef, useState } from "react";
import { LayoutChangeEvent, PanResponder, View } from "react-native";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";

const HANDLE_SIZE = 26;
const TRACK_HEIGHT = 6;

function useTrackWidth() {
  const [trackWidth, setTrackWidth] = useState(0);
  const onTrackLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width - HANDLE_SIZE);
  };
  return { trackWidth, onTrackLayout };
}

function valueToXWith(min: number, max: number, trackWidth: number, value: number) {
  return trackWidth <= 0 ? 0 : ((value - min) / (max - min)) * trackWidth;
}

function xToValueWith(min: number, max: number, step: number, trackWidth: number, x: number) {
  if (trackWidth <= 0) return min;
  const ratio = Math.min(1, Math.max(0, x / trackWidth));
  const raw = min + ratio * (max - min);
  return Math.round(raw / step) * step;
}

function SliderTrackBase({
  onLayout,
  children,
}: {
  onLayout: (event: LayoutChangeEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <View
      className="justify-center"
      style={{ height: HANDLE_SIZE, paddingHorizontal: HANDLE_SIZE / 2 }}
      onLayout={onLayout}
    >
      {children}
    </View>
  );
}

function TrackSegment({ left, right, width, active }: { left?: number; right?: number; width?: number; active: boolean }) {
  return (
    <View
      className="absolute rounded-full"
      style={{
        left,
        right,
        width,
        height: TRACK_HEIGHT,
        backgroundColor: active ? C.gatePrimary : C.error,
      }}
    />
  );
}

function EdgeLabels({
  min,
  max,
  formatEdgeLabel,
}: {
  min: number;
  max: number;
  formatEdgeLabel: (value: number) => string;
}) {
  return (
    <View className="mt-2 flex-row justify-between">
      <PretendardFont weight="semibold" style={{ fontSize: 12, color: C.ter }}>
        {formatEdgeLabel(min)}
      </PretendardFont>
      <PretendardFont weight="semibold" style={{ fontSize: 12, color: C.ter }}>
        {formatEdgeLabel(max)}
      </PretendardFont>
    </View>
  );
}

export interface DualRangeSliderProps {
  min: number;
  max: number;
  step?: number;
  low: number;
  high: number;
  onChange: (low: number, high: number) => void;
  /** 두 핸들이 이보다 가까이 붙지 못하게 하는 최소 간격. 기본값은 0(제한 없음). */
  minGap?: number;
  /** 트랙 양 끝(min, max) 아래에 표시할 라벨. 기본값은 min/max 숫자. */
  formatEdgeLabel?: (value: number) => string;
  /** 핸들 위 원 안에 표시할 값 라벨. 기본값은 값 숫자. */
  formatHandleLabel?: (value: number) => string;
}

export function DualRangeSlider({
  min,
  max,
  step = 1,
  low,
  high,
  onChange,
  minGap = 0,
  formatEdgeLabel = (value) => String(value),
  formatHandleLabel = (value) => String(value),
}: DualRangeSliderProps) {
  const { trackWidth, onTrackLayout } = useTrackWidth();

  const latest = useRef({ min, max, step, trackWidth, low, high, onChange, minGap });
  latest.current = { min, max, step, trackWidth, low, high, onChange, minGap };

  const dragRef = useRef<{ handle: "low" | "high"; startX: number } | null>(null);

  const makePanResponder = (handle: "low" | "high") =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        const { min, max, trackWidth, low, high } = latest.current;
        dragRef.current = {
          handle,
          startX: valueToXWith(min, max, trackWidth, handle === "low" ? low : high),
        };
      },
      onPanResponderMove: (_, gesture) => {
        const drag = dragRef.current;
        if (!drag) return;
        const { min, max, step, trackWidth, low, high, onChange, minGap } = latest.current;
        const nextValue = xToValueWith(min, max, step, trackWidth, drag.startX + gesture.dx);
        if (drag.handle === "low") {
          onChange(Math.min(nextValue, high - minGap), high);
        } else {
          onChange(low, Math.max(nextValue, low + minGap));
        }
      },
      onPanResponderRelease: () => {
        dragRef.current = null;
      },
      onPanResponderTerminate: () => {
        dragRef.current = null;
      },
    });

  const lowPanResponder = useMemo(() => makePanResponder("low"), []);
  const highPanResponder = useMemo(() => makePanResponder("high"), []);

  const lowX = valueToXWith(min, max, trackWidth, low);
  const highX = valueToXWith(min, max, trackWidth, high);

  return (
    <View>
      <SliderTrackBase onLayout={onTrackLayout}>
        <TrackSegment left={HANDLE_SIZE / 2} right={HANDLE_SIZE / 2} active={false} />
        <TrackSegment left={HANDLE_SIZE / 2 + lowX} width={Math.max(0, highX - lowX)} active />

        <SliderHandle x={lowX} label={formatHandleLabel(low)} panHandlers={lowPanResponder.panHandlers} />
        <SliderHandle x={highX} label={formatHandleLabel(high)} panHandlers={highPanResponder.panHandlers} />
      </SliderTrackBase>

      <EdgeLabels min={min} max={max} formatEdgeLabel={formatEdgeLabel} />
    </View>
  );
}

export interface SingleRangeSliderProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  /** 기준점 기준 어느 쪽을 활성(파란) 구간으로 표시할지. "after"면 기준점 이후, "before"면 이전. */
  activeSide: "before" | "after";
  formatEdgeLabel?: (value: number) => string;
  formatHandleLabel?: (value: number) => string;
}

export function SingleRangeSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  activeSide,
  formatEdgeLabel = (value) => String(value),
  formatHandleLabel = (value) => String(value),
}: SingleRangeSliderProps) {
  const { trackWidth, onTrackLayout } = useTrackWidth();

  const latest = useRef({ min, max, step, trackWidth, value, onChange });
  latest.current = { min, max, step, trackWidth, value, onChange };

  const dragRef = useRef<{ startX: number } | null>(null);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          const { min, max, trackWidth, value } = latest.current;
          dragRef.current = { startX: valueToXWith(min, max, trackWidth, value) };
        },
        onPanResponderMove: (_, gesture) => {
          const drag = dragRef.current;
          if (!drag) return;
          const { min, max, step, trackWidth, onChange } = latest.current;
          onChange(xToValueWith(min, max, step, trackWidth, drag.startX + gesture.dx));
        },
        onPanResponderRelease: () => {
          dragRef.current = null;
        },
        onPanResponderTerminate: () => {
          dragRef.current = null;
        },
      }),
    [],
  );

  const x = valueToXWith(min, max, trackWidth, value);

  return (
    <View>
      <SliderTrackBase onLayout={onTrackLayout}>
        <TrackSegment left={HANDLE_SIZE / 2} right={HANDLE_SIZE / 2} active={false} />
        {activeSide === "after" ? (
          <TrackSegment left={HANDLE_SIZE / 2 + x} right={HANDLE_SIZE / 2} active />
        ) : (
          <TrackSegment left={HANDLE_SIZE / 2} width={x} active />
        )}

        <SliderHandle x={x} label={formatHandleLabel(value)} panHandlers={panResponder.panHandlers} />
      </SliderTrackBase>

      <EdgeLabels min={min} max={max} formatEdgeLabel={formatEdgeLabel} />
    </View>
  );
}

function SliderHandle({
  x,
  label,
  panHandlers,
}: {
  x: number;
  label: string;
  panHandlers: ReturnType<typeof PanResponder.create>["panHandlers"];
}) {
  return (
    <View
      {...panHandlers}
      className="absolute items-center justify-center rounded-full"
      style={{
        left: x,
        width: HANDLE_SIZE,
        height: HANDLE_SIZE,
        borderRadius: HANDLE_SIZE / 2,
        backgroundColor: C.white,
        borderWidth: 2,
        borderColor: C.gatePrimary,
        shadowColor: C.shadow,
        shadowOpacity: 0.15,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
        elevation: 2,
      }}
    >
      <PretendardFont
        weight="bold"
        numberOfLines={1}
        style={{
          position: "absolute",
          top: -22,
          left: HANDLE_SIZE / 2 - 28,
          width: 56,
          fontSize: 12,
          color: C.gatePrimary,
          textAlign: "center",
        }}
      >
        {label}
      </PretendardFont>
    </View>
  );
}
