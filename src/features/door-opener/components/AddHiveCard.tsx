/**
 * IoT 홈에서 쓰는 벌통 등록 카드입니다.
 * 일반 벌통 카드와 같은 크기를 유지해서 그리드 레이아웃이 흔들리지 않게 합니다.
 */
import { Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";

export function AddHiveCard({
  size,
  onPress,
}: {
  size: number;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="active:opacity-70" style={{ width: size }}>
      <View
        className="items-center justify-center"
        style={{
          height: size * 0.64,
          borderRadius: 14,
          borderWidth: 1.5,
          borderColor: "rgba(255,255,255,0.55)",
          borderStyle: "dashed",
          backgroundColor: "rgba(255,255,255,0.08)",
        }}
      >
        <Feather name="plus" size={26} color={C.white} />
        <PretendardFont
          weight="semibold"
          style={{ fontSize: 14.5, color: C.white, marginTop: 6 }}
        >
          벌통 추가하기
        </PretendardFont>
      </View>
    </Pressable>
  );
}
