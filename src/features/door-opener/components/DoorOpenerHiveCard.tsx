import {
  Animated,
  Image,
  Pressable,
  View,
  type GestureResponderHandlers,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import type { HiveData } from "@/types/hive-control";

const BEE_ICON = require("../../../../assets/homeIcons/bee.png");

/**
 * 개폐기 화면에서 쓰는 벌통 카드
 * - 기본 상태에서는 수정 버튼과 연결 상태를 보여줍니다.
 * - 삭제 모드에서는 전원 아이콘 대신 삭제 버튼(-)을 노출합니다.
 */
export function DoorOpenerHiveCard({
  hive,
  size,
  editable,
  dragging,
  panHandlers,
  dragOffset,
  onPress,
  onEdit,
  onDelete,
  onLongPress,
  onPressOut,
}: {
  hive: HiveData;
  size: number;
  editable?: boolean;
  dragging?: boolean;
  panHandlers?: GestureResponderHandlers;
  dragOffset?: Animated.ValueXY;
  onPress: () => void;
  onEdit: () => void;
  onDelete?: () => void;
  onLongPress?: () => void;
  onPressOut?: () => void;
}) {
  const offline = hive.status === "offline";
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
        onPressOut={onPressOut}
        delayLongPress={260}
        className="active:opacity-80"
      >
        <View
          className="justify-between"
          style={{
            height: size * 0.6,
            borderRadius: 14,
            padding: 14,
            backgroundColor: "rgba(255,255,255,0.16)",
            borderWidth: dragging ? 2 : 1,
            borderColor: dragging ? C.cardBorderDragging : C.cardBorder,
            opacity: dragging ? 0.92 : 1,
          }}
        >
          <View className="flex-row items-start justify-between">
            <Image
              source={BEE_ICON}
              style={{ width: 34, height: 34, opacity: offline ? 0.45 : 1 }}
              resizeMode="contain"
            />

            <View className="flex-row" style={{ gap: 6 }}>
              <RoundIconButton icon="edit-2" onPress={onEdit} />

              {editable && onDelete ? (
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
              ) : (
                <View
                  className="items-center justify-center rounded-full"
                  style={{
                    width: 30,
                    height: 30,
                    backgroundColor: "rgba(255,255,255,0.22)",
                  }}
                >
                  <Feather
                    name="power"
                    size={15}
                    color={offline ? "rgba(255,255,255,0.5)" : C.white}
                  />
                </View>
              )}
            </View>
          </View>

          <View>
            <PretendardFont
              weight="bold"
              numberOfLines={1}
              style={{ fontSize: 15, color: C.white }}
            >
              {hive.name}
            </PretendardFont>
            <PretendardFont
              weight="medium"
              style={{
                fontSize: 12.5,
                color: "rgba(255,255,255,0.8)",
                marginTop: 3,
              }}
            >
              {offline
                ? "오프라인"
                : `${hive.temperature.toFixed(1)}°C · ${hive.humidity}%`}
            </PretendardFont>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** 카드 우측 상단의 작은 원형 액션 버튼입니다. */
function RoundIconButton({
  icon,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={(event) => {
        event.stopPropagation();
        onPress();
      }}
      hitSlop={8}
      className="items-center justify-center rounded-full active:opacity-70"
      style={{
        width: 30,
        height: 30,
        backgroundColor: "rgba(255,255,255,0.22)",
      }}
    >
      <Feather name={icon} size={14} color={C.white} />
    </Pressable>
  );
}
