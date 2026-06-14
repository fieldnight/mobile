/**
 * IoT 홈 - 벌통 추가 카드 (벌통 카드와 동일 크기 · 글래스 점선)
 * - 탭하면 벌통 추가(hive-add) 페이지로 이동
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
          style={{ fontSize: 13, color: C.white, marginTop: 6 }}
        >
          벌통 추가하기
        </PretendardFont>
      </View>
    </Pressable>
  );
}
