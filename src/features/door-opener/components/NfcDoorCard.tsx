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
import type { NfcDoorCardConfig } from "./nfcDoorCards";

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
          {active && runtimeLabel ? (
            <View
              className="mb-2 self-start rounded-full px-2.5 py-1"
              style={{ backgroundColor: "rgba(248,209,92,0.96)" }}
            >
              <PretendardFont
                weight="bold"
                numberOfLines={1}
                style={{ fontSize: 12.5, color: C.text }}
              >
                실행중 · {runtimeLabel}
              </PretendardFont>
            </View>
          ) : null}
          <View className="flex-row items-start justify-between">
            <Feather name={card.icon} size={20} color={C.text} />

            {editable && card.removable && onDelete && (
              <Pressable
                onPress={(event) => {
                  event.stopPropagation();
                  onDelete();
                }}
                hitSlop={8}
                className="items-center justify-center rounded-full active:opacity-70"
                style={{
                  width: 30,
                  height: 30,
                  backgroundColor: "rgba(239, 68, 68, 0.92)",
                }}
              >
                <PretendardFont
                  weight="bold"
                  style={{ fontSize: 20, color: C.white }}
                >
                  -
                </PretendardFont>
              </Pressable>
            )}
          </View>

          <View style={{ gap: 3 }}>
            <PretendardFont
              weight="bold"
              style={{ fontSize: 18, lineHeight: 23, color: C.text }}
            >
              {card.title}
            </PretendardFont>
            <PretendardFont
              weight="semibold"
              style={{
                fontSize: 12.5,
                lineHeight: 17,
                color: "#5A6270",
              }}
            >
              {card.description}
            </PretendardFont>
          </View>
        </CardShell>
      </Pressable>
    </Animated.View>
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
        borderRadius: 14,
        padding: 14,
        backgroundColor: active ? "rgba(248,209,92,0.18)" : C.white,
        borderWidth: active || dragging ? 2 : 1,
        borderColor: active
          ? "#F8D15C"
          : dragging
            ? C.primary
            : "rgba(0,0,0,0.05)",
        opacity: dragging ? 0.92 : 1,
      }}
    >
      {children}
    </View>
  );
}
