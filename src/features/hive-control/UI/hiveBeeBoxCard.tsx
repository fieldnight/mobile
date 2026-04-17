import { View, Pressable, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { BoxColor as C } from "@/types";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface HiveData {
  id: string;
  name: string;
  status: "online" | "offline";
  temperature: number;
  humidity: number;
  weight: number;
  beeActivity: "high" | "medium" | "low";
  lastUpdate: string;
}

interface ActiveTag {
  label: string;
  color: string;
  bg: string;
}

function StatusBadge({ status }: { status: "online" | "offline" }) {
  const isOnline = status === "online";
  return (
    <View
      className="flex-row items-center rounded-xl gap-1"
      style={{
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: isOnline ? "#E8F5E9" : "#FFEBEE",
      }}
    >
      <View
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: isOnline ? C.success : C.error }}
      />
      <Text
        style={{
          fontSize: 12,
          fontWeight: "500",
          color: isOnline ? C.success : C.error,
        }}
      >
        {isOnline ? "연결됨" : "오프라인"}
      </Text>
    </View>
  );
}

export function HiveBeeBoxCard({
  hive,
  onPress,
  activeTags,
}: {
  hive: HiveData;
  onPress: () => void;
  activeTags: ActiveTag[];
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[{ margin: -16, padding: 16 }, animatedStyle]}
      data-testid={`hive-BeeBoxcard-${hive.id}`}
    >
      <View className="flex-row items-center">
        <View className="flex-1">
          <Text style={{ fontSize: 16, fontWeight: "600", color: C.text }}>
            {hive.name}
          </Text>
          <Text style={{ fontSize: 12, color: C.ter, marginTop: 2 }}>
            업데이트: {hive.lastUpdate}
          </Text>
        </View>
        <StatusBadge status={hive.status} />
      </View>

      {hive.status === "online" ? (
        <>
          <View
            className="my-3"
            style={{ height: 1, backgroundColor: C.border }}
          />
          <View className="flex-row justify-around">
            <View className="flex-1 items-center gap-1">
              <Feather name="thermometer" size={16} color={C.sec} />
              <Text style={{ fontSize: 18, fontWeight: "700", color: C.text }}>
                {hive.temperature}°C
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: C.border }} />
            <View className="flex-1 items-center gap-1">
              <Feather name="droplet" size={16} color={C.sec} />
              <Text style={{ fontSize: 18, fontWeight: "700", color: C.text }}>
                {hive.humidity}%
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: C.border }} />
            <View className="flex-1 items-center gap-1">
              {activeTags.length > 0 ? (
                <View className="flex-row flex-wrap justify-center gap-1">
                  {activeTags.map((tag, i) => (
                    <View
                      key={i}
                      style={{
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 6,
                        backgroundColor: tag.bg,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: "600",
                          color: tag.color,
                        }}
                      >
                        {tag.label}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <>
                  <Feather name="minus-circle" size={14} color={C.ter} />
                  <Text style={{ fontSize: 12, color: C.sec, marginTop: 2 }}>
                    제어 없음
                  </Text>
                </>
              )}
            </View>
          </View>
        </>
      ) : (
        <View className="flex-row items-center justify-center gap-2 py-4">
          <Feather name="wifi-off" size={20} color={C.ter} />
          <Text style={{ fontSize: 14, color: C.ter }}>
            연결을 확인해주세요
          </Text>
        </View>
      )}
    </AnimatedPressable>
  );
}
