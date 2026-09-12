import type { ReactNode } from "react";
import {
  Animated,
  Pressable,
  View,
  type GestureResponderHandlers,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import { isCountControlMode, type NfcDoorCardConfig } from "./nfcDoorCards";

/**
 * 삼성 스마트싱스 앱의 방(room)별 기기 카드 그리드를 참고한 스타일.
 * - 카드 배경은 화면 배경보다 살짝 짙은 단색(stCardBg), 그림자는 거의 없음.
 * - 아이콘은 원형 배지 안에 들어가고, 실행중이면 컬러(stIconBadgeOn)로 채워지고
 *   아니면 회색(stIconBadgeOff)으로 바뀝니다 — 텍스트보다 이 배지 색이 on/off를
 *   먼저 보여주는 1차 신호입니다.
 */
export function NfcDoorCard({
  card,
  size,
  editable,
  dragging,
  active,
  runtimeLabel,
  panHandlers,
  dragOffset,
  onPress,
  onLongPress,
  onDelete,
}: {
  card: NfcDoorCardConfig;
  size: number;
  editable: boolean;
  dragging?: boolean;
  active?: boolean;
  runtimeLabel?: string | null;
  panHandlers?: GestureResponderHandlers;
  dragOffset?: Animated.ValueXY;
  onPress: () => void;
  onLongPress?: () => void;
  onDelete?: () => void;
}) {
  const transform =
    dragging && dragOffset
      ? [...dragOffset.getTranslateTransform(), { scale: 1.06 }]
      : undefined;

  const showOneTimeTag = isCountControlMode(card.mode) && !card.repeat;

  return (
    <Animated.View
      {...panHandlers}
      style={[
        {
          width: size,
          zIndex: dragging ? 30 : 0,
          elevation: dragging ? 12 : 0,
        },
        transform ? { transform } : undefined,
      ]}
    >
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={260}
        className="active:opacity-80"
      >
        <CardShell size={size} dragging={dragging} active={active}>
          <View className="flex-row items-start justify-between">
            <IconBadge icon={card.icon} on={Boolean(active)} />

            {showOneTimeTag && !(editable && card.removable && onDelete) && <OneTimeTag />}

            {editable && card.removable && onDelete && (
              <Pressable
                onPress={(event) => {
                  event.stopPropagation();
                  onDelete();
                }}
                hitSlop={8}
                className="items-center justify-center rounded-full active:opacity-70"
                style={{
                  width: 26,
                  height: 26,
                  backgroundColor: "rgba(239, 68, 68, 0.92)",
                }}
              >
                <PretendardFont
                  weight="bold"
                  style={{ fontSize: 17, color: C.white, lineHeight: 17 }}
                >
                  -
                </PretendardFont>
              </Pressable>
            )}
          </View>

          <View style={{ gap: 2 }}>
            <PretendardFont
              weight="semibold"
              numberOfLines={1}
              style={{ fontSize: 14.5, lineHeight: 19, color: C.text }}
            >
              {card.title}
            </PretendardFont>
            <PretendardFont
              weight="medium"
              numberOfLines={2}
              style={{
                fontSize: 14,
                lineHeight: 18,
                color: active ? C.stIconBadgeOn : C.sec,
              }}
            >
              {active && runtimeLabel
                ? runtimeLabel
                : active
                  ? "실행중"
                  : card.removable
                    ? card.memo || card.description
                    : card.description}
            </PretendardFont>
          </View>
        </CardShell>
      </Pressable>
    </Animated.View>
  );
}

/** 반복 요일을 하나도 선택하지 않은 벌 마릿수 제어 카드(단발성)에 붙는 태그입니다. */
function OneTimeTag() {
  return (
    <View
      className="items-center justify-center rounded-full"
      style={{
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: C.white,
        borderWidth: 1,
        borderColor: C.border,
      }}
    >
      <PretendardFont weight="bold" style={{ fontSize: 10.5, lineHeight: 13, color: C.textAlt }}>
        단일
      </PretendardFont>
    </View>
  );
}

function IconBadge({ icon, on }: { icon: keyof typeof Feather.glyphMap; on: boolean }) {
  return (
    <View
      className="items-center justify-center rounded-full"
      style={{
        width: 40,
        height: 40,
        backgroundColor: on ? C.stIconBadgeOn : C.stIconBadgeOff,
      }}
    >
      <Feather name={icon} size={18} color={on ? C.white : C.stIconOff} />
    </View>
  );
}

function CardShell({
  size,
  dragging,
  active,
  children,
}: {
  size: number;
  dragging?: boolean;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <View
      className="justify-between"
      style={{
        minHeight: size * 0.66,
        borderRadius: 16,
        padding: 14,
        gap: 10,
        backgroundColor: C.stCardBg,
        borderWidth: dragging ? 2 : 0,
        borderColor: dragging ? C.gatePrimary : "transparent",
        opacity: dragging ? 0.92 : 1,
        shadowColor: C.shadow,
        shadowOpacity: active ? 0.08 : 0.04,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
        elevation: dragging ? 12 : 1,
      }}
    >
      {children}
    </View>
  );
}
