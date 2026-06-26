import type { ReactNode } from "react";
import { Animated, Pressable, View, type GestureResponderHandlers } from "react-native";
import { Feather } from "@expo/vector-icons";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import type { NfcDoorCardConfig } from "./nfcDoorCards";

export function NfcDoorCard({
  card,
  size,
  editable,
  dragging,
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
  panHandlers?: GestureResponderHandlers;
  dragOffset?: Animated.ValueXY;
  onPress: () => void;
  onLongPress?: () => void;
  onDelete?: () => void;
}) {
  const transform = dragging && dragOffset
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
        <CardShell size={size} dragging={dragging}>
          <View className="flex-row items-start justify-between">
            <Feather name={card.icon} size={27} color={C.white} />

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
                  backgroundColor: "rgba(255,255,255,0.22)",
                }}
              >
                <PretendardFont weight="bold" style={{ fontSize: 18, color: C.white }}>
                  -
                </PretendardFont>
              </Pressable>
            )}
          </View>

          <View style={{ gap: 3 }}>
            <PretendardFont
              weight="bold"
              numberOfLines={1}
              style={{ fontSize: 15, color: C.white }}
            >
              {card.title}
            </PretendardFont>
            <PretendardFont
              weight="medium"
              style={{
                fontSize: 12,
                lineHeight: 16,
                color: "rgba(255,255,255,0.8)",
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

export function AddNfcDoorCardButton({
  size,
  onPress,
}: {
  size: number;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="active:opacity-70" style={{ width: size }}>
      <CardShell size={size} dashed>
        <View className="flex-1 items-center justify-center">
          <Feather name="plus" size={26} color={C.white} />
          <PretendardFont
            weight="semibold"
            style={{ fontSize: 13, color: C.white, marginTop: 6 }}
          >
            추가하기
          </PretendardFont>
        </View>
      </CardShell>
    </Pressable>
  );
}

function CardShell({
  size,
  dragging,
  dashed,
  children,
}: {
  size: number;
  dragging?: boolean;
  dashed?: boolean;
  children: ReactNode;
}) {
  return (
    <View
      className={dashed ? "items-center justify-center" : "justify-between"}
      style={{
        minHeight: size * 0.58,
        borderRadius: 14,
        padding: 14,
        backgroundColor: "rgba(255,255,255,0.16)",
        borderWidth: dragging ? 2 : dashed ? 1.5 : 1,
        borderStyle: dashed ? "dashed" : "solid",
        borderColor: dragging
          ? C.cardBorderDragging
          : dashed
            ? "rgba(255,255,255,0.55)"
            : C.cardBorder,
        opacity: dragging ? 0.92 : 1,
      }}
    >
      {children}
    </View>
  );
}
