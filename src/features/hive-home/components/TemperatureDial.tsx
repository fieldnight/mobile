import { useMemo, useRef } from "react";
import { PanResponder, View } from "react-native";
import Svg, { Circle, G, Line, Path } from "react-native-svg";
import { PretendardFont } from "@/components/PretendardFont";
import { COMFORT_MAX, COMFORT_MIN, T } from "../theme";
import { formatValue } from "../model/hiveCondition";

const DIAL_MIN = 10;
const DIAL_MAX = 40;
const START_DEG = 150;
const SWEEP_DEG = 240;
const STROKE = 10;
// 목표 온도 손잡이: 턴테이블 톤암처럼 트랙 안쪽에서 바깥으로 뻗은 가는 바늘 끝에 둥근 머리가 달린 모양.
// 화살표 없이도 "끝을 잡고 돌리는 바늘"로 읽히게 합니다.
const KNOB_R = 8;
const KNOB_HALO_R = 14;
const KNOB_GAP = STROKE / 2 + KNOB_R + 5;
const NEEDLE_W = 3;
// 바늘이 트랙 안쪽으로 파고드는 길이
const NEEDLE_INNER = STROKE / 2 + 5;
// 트랙 중심선에서 안팎으로 이만큼(손잡이 포함)만 다이얼 터치로 받습니다. 가운데는 카드 넘김에 양보합니다.
const RING_TOUCH_BAND = 30;

function angleOf(value: number) {
  const ratio = (Math.min(DIAL_MAX, Math.max(DIAL_MIN, value)) - DIAL_MIN) / (DIAL_MAX - DIAL_MIN);
  return START_DEG + ratio * SWEEP_DEG;
}

/**
 * 다이얼 중심 기준 좌표를 온도로 바꿉니다.
 * 트랙이 없는 아래쪽 빈 구간은 가까운 끝(최저/최고)으로 붙여 손가락이 지나가도 값이 튀지 않게 합니다.
 */
function valueAt(dx: number, dy: number) {
  const deg = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
  const end = (START_DEG + SWEEP_DEG) % 360;
  let sweep: number;
  if (deg >= START_DEG) sweep = deg - START_DEG;
  else if (deg <= end) sweep = deg + 360 - START_DEG;
  else sweep = deg < 90 ? SWEEP_DEG : 0;
  return DIAL_MIN + (sweep / SWEEP_DEG) * (DIAL_MAX - DIAL_MIN);
}

function pointAt(c: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: c + r * Math.cos(rad), y: c + r * Math.sin(rad) };
}

function arcPath(c: number, r: number, fromDeg: number, toDeg: number) {
  const a = pointAt(c, r, fromDeg);
  const b = pointAt(c, r, toDeg);
  const large = toDeg - fromDeg > 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`;
}

/**
 * 벌통 내부 온도 다이얼
 * - 회색 트랙 위 초록 구간이 수정벌 권장 온도(24~27°C)입니다.
 * - 점은 현재 내부 온도, 바깥 눈금(조작 가능하면 둥근 머리 바늘 손잡이)은 목표 온도입니다.
 * - editingTarget이 있으면 가운데 숫자가 바꾸는 중인 목표 온도로 바뀝니다.
 * - onChangeTarget이 있으면 다이얼을 돌려 목표 온도를 바꿉니다. 링(트랙·손잡이 주변 띠)에서 누른
 *   손가락만 잡고, 뗄 때까지 화면 어디로 움직여도 이 다이얼만 따라갑니다. 그동안 onDragStateChange로
 *   바깥 스크롤·페이지 넘김을 잠그게 합니다. 가운데 숫자 쪽에서 시작한 스와이프는 카드 넘김으로 갑니다.
 * - locked면(연결 끊김·설정 불러오는 중) 손잡이를 회색으로 그리고 돌릴 수 없습니다.
 *   링을 누르면 onLockedTouch로 이유를 알리고, 이어지는 스와이프는 카드 넘김에 양보합니다.
 */
export function TemperatureDial({
  size,
  temperature,
  targetTemperature,
  color,
  dimmed,
  editingTarget = null,
  onChangeTarget,
  onStep,
  onDragStateChange,
  locked = false,
  onLockedTouch,
}: {
  size: number;
  temperature: number | null;
  targetTemperature: number | null;
  color: string;
  dimmed: boolean;
  editingTarget?: number | null;
  /** 없으면 보기 전용 다이얼입니다. */
  onChangeTarget?: (value: number) => void;
  /** 화면 낭독기의 올리기/내리기 동작에 씁니다. */
  onStep?: (direction: 1 | -1) => void;
  onDragStateChange?: (dragging: boolean) => void;
  locked?: boolean;
  onLockedTouch?: () => void;
}) {
  const editing = editingTarget != null;
  const interactive = !!onChangeTarget;
  const c = size / 2;
  const r = c - STROKE - (interactive ? KNOB_GAP + KNOB_HALO_R - STROKE / 2 + 2 : 6);
  const hasValue = temperature != null && Number.isFinite(temperature);
  const marker = hasValue ? pointAt(c, r, angleOf(temperature)) : null;
  const handleValue = editingTarget ?? targetTemperature;
  const handleDeg = handleValue != null ? angleOf(handleValue) : null;
  const tickIn = handleDeg != null ? pointAt(c, r + STROKE / 2 + 2, handleDeg) : null;
  const tickOut = handleDeg != null ? pointAt(c, r + STROKE / 2 + 9, handleDeg) : null;
  const knob = handleDeg != null ? pointAt(c, r + KNOB_GAP, handleDeg) : null;
  const needleBase = handleDeg != null ? pointAt(c, r - NEEDLE_INNER, handleDeg) : null;
  const knobColor = locked ? T.off : T.brand;

  // PanResponder는 한 번만 만들고, 바뀌는 값은 ref로 읽습니다.
  const latestRef = useRef({ c, r, onChangeTarget, onDragStateChange, locked, onLockedTouch });
  latestRef.current = { c, r, onChangeTarget, onDragStateChange, locked, onLockedTouch };
  const startRef = useRef({ x: 0, y: 0 });
  // 터치를 시작한 순간 잠겨 있었는지. 제스처 도중 상태가 바뀌어도 한 제스처는 한 방식으로 끝냅니다.
  const dragLockedRef = useRef(false);

  const responder = useMemo(() => {
    const finish = () => {
      if (!dragLockedRef.current) latestRef.current.onDragStateChange?.(false);
    };
    return PanResponder.create({
      // 링 위에서 시작한 터치만 바로 가져가 카드 넘김·세로 스크롤이 먼저 잡지 못하게 합니다.
      onStartShouldSetPanResponder: (event) => {
        const { c: center, r: radius, onChangeTarget: change, locked: isLocked, onLockedTouch: notify } = latestRef.current;
        if (!change || (isLocked && !notify)) return false;
        const distance = Math.hypot(event.nativeEvent.locationX - center, event.nativeEvent.locationY - center);
        return Math.abs(distance - radius) <= RING_TOUCH_BAND;
      },
      onMoveShouldSetPanResponder: () => false,
      // 잠긴 다이얼은 안내만 하고, 이어지는 스와이프는 카드 넘김에 넘겨줍니다.
      onPanResponderTerminationRequest: () => dragLockedRef.current,
      onShouldBlockNativeResponder: () => !dragLockedRef.current,
      onPanResponderGrant: (event) => {
        dragLockedRef.current = latestRef.current.locked;
        if (dragLockedRef.current) {
          latestRef.current.onLockedTouch?.();
          return;
        }
        startRef.current = { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY };
        latestRef.current.onDragStateChange?.(true);
      },
      onPanResponderMove: (_, gesture) => {
        if (dragLockedRef.current) return;
        const { c: center, onChangeTarget: change } = latestRef.current;
        const x = startRef.current.x + gesture.dx - center;
        const y = startRef.current.y + gesture.dy - center;
        // 중심에 너무 가까우면 각도가 불안정해 무시합니다.
        if (Math.hypot(x, y) < center * 0.2) return;
        change?.(valueAt(x, y));
      },
      onPanResponderRelease: finish,
      onPanResponderTerminate: finish,
    });
  }, []);

  const label = editing
    ? `바꿀 목표 온도 ${editingTarget.toFixed(1)}도, 내부 온도 ${formatValue(temperature)}도`
    : hasValue
    ? `내부 온도 ${formatValue(temperature)}도${targetTemperature != null ? `, 목표 ${targetTemperature.toFixed(1)}도` : ""}`
    : "내부 온도 측정값 없음";

  return (
    <View
      {...(interactive ? responder.panHandlers : null)}
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={label}
      accessibilityRole={interactive ? "adjustable" : undefined}
      accessibilityHint={interactive ? "다이얼을 돌리거나 위아래로 쓸어 목표 온도를 0.5도씩 바꿀 수 있어요" : undefined}
      accessibilityActions={interactive ? [{ name: "increment", label: "0.5도 올리기" }, { name: "decrement", label: "0.5도 내리기" }] : undefined}
      onAccessibilityAction={(event) => onStep?.(event.nativeEvent.actionName === "increment" ? 1 : -1)}
      style={{ width: size, height: size * 0.86, alignItems: "center" }}
    >
      {/* 터치 좌표가 항상 다이얼 기준이 되도록 그림은 터치를 받지 않습니다. */}
      <View pointerEvents="none">
        <Svg width={size} height={size}>
          <Path d={arcPath(c, r, START_DEG, START_DEG + SWEEP_DEG)} stroke={T.line} strokeWidth={STROKE} strokeLinecap="round" fill="none" />
          <Path d={arcPath(c, r, angleOf(COMFORT_MIN), angleOf(COMFORT_MAX))} stroke={dimmed ? T.off : T.good} strokeOpacity={0.35} strokeWidth={STROKE} fill="none" />
          {interactive && knob && needleBase ? (
            <G>
              {/* 돌리는 중에만 머리 주변에 옅은 후광을 띄웁니다. */}
              {editing ? <Circle cx={knob.x} cy={knob.y} r={KNOB_HALO_R} fill={knobColor} fillOpacity={0.18} /> : null}
              <Line x1={needleBase.x} y1={needleBase.y} x2={knob.x} y2={knob.y} stroke={T.panel} strokeWidth={NEEDLE_W + 3} strokeLinecap="round" />
              <Line x1={needleBase.x} y1={needleBase.y} x2={knob.x} y2={knob.y} stroke={knobColor} strokeWidth={NEEDLE_W} strokeLinecap="round" />
              <Circle cx={knob.x} cy={knob.y} r={KNOB_R} fill={knobColor} stroke={T.panel} strokeWidth={2.5} />
              {/* 머리 가운데 축 점: 잡는 자리라는 걸 작게 알려줍니다. */}
              <Circle cx={knob.x} cy={knob.y} r={2.5} fill={T.panel} />
            </G>
          ) : tickIn && tickOut ? (
            <Line x1={tickIn.x} y1={tickIn.y} x2={tickOut.x} y2={tickOut.y} stroke={T.ink} strokeWidth={2.5} strokeLinecap="round" />
          ) : null}
          {marker ? (
            <Circle cx={marker.x} cy={marker.y} r={STROKE - 1} fill={T.panel} stroke={dimmed ? T.off : color} strokeWidth={4} />
          ) : null}
        </Svg>
      </View>

      <View pointerEvents="none" className="absolute top-0 left-0 right-0 items-center justify-center" style={{ height: size }}>
        <PretendardFont style={{ fontSize: 13, color: editing ? T.brand : T.muted }}>{editing ? "목표 온도" : "내부 온도"}</PretendardFont>
        <View className="flex-row items-start mt-0.5">
          <PretendardFont
            weight="semibold"
            style={{ fontSize: 56, lineHeight: 64, letterSpacing: -2, color: editing ? T.brand : dimmed ? T.muted : T.ink, fontVariant: ["tabular-nums"] }}
          >
            {editing ? editingTarget.toFixed(1) : formatValue(temperature)}
          </PretendardFont>
          <PretendardFont weight="medium" style={{ fontSize: 22, marginTop: 8, color: T.muted }}>°C</PretendardFont>
        </View>
        <PretendardFont style={{ fontSize: 12.5, color: T.muted, marginTop: 2 }}>
          {editing
            ? `지금 내부 ${formatValue(temperature)}°C`
            : targetTemperature != null ? `목표 ${targetTemperature.toFixed(1)}°C` : "목표 온도 확인 중"}
        </PretendardFont>
      </View>
    </View>
  );
}
