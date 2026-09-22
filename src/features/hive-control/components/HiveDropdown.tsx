import { View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { BoxColor as C } from "@/types";
import { PretendardFont } from "@/components/PretendardFont";

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

export function HiveDropdown({
  hives,
  selectedId,
  onSelect,
  onClose,
  style,
  testPrefix,
}: {
  hives: HiveData[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  style?: any;
  testPrefix: string;
}) {
  return (
    <>
      <Pressable
        style={{
          position: "absolute",
          top: 0,
          left: -20,
          right: -20,
          bottom: -500,
          zIndex: 11,
        }}
        onPress={onClose}
      />
      <View
        style={[
          {
            position: "absolute",
            top: 44,
            right: 0,
            width: 180,
            backgroundColor: C.white,
            borderRadius: 12,
            zIndex: 12,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 12,
            elevation: 8,
            overflow: "hidden",
          },
          style,
        ]}
      >
        {hives.map((hive) => (
          <Pressable
            key={hive.id}
            onPress={() => onSelect(hive.id)}
            className="flex-row items-center justify-between"
            style={[
              { paddingHorizontal: 14, paddingVertical: 10 },
              selectedId === hive.id && { backgroundColor: "#EBF4FF" },
            ]}
            data-testid={`button-${testPrefix}-hive-${hive.id}`}
          >
            <View className="flex-row items-center gap-2">
              <Feather
                name="box"
                size={14}
                color={selectedId === hive.id ? C.primary : C.sec}
              />
              <PretendardFont
                weight={selectedId === hive.id ? "semibold" : "regular"}
                className="text-[14px]"
                style={{ color: selectedId === hive.id ? C.primary : C.text }}
              >
                {hive.name}
              </PretendardFont>
            </View>
            {hive.status === "offline" && (
              <PretendardFont
                className="text-[11px] mr-2"
                style={{ color: C.error }}
              >
                오프라인
              </PretendardFont>
            )}
            {selectedId === hive.id && (
              <Feather name="check" size={16} color={C.primary} />
            )}
          </Pressable>
        ))}
      </View>
    </>
  );
}
