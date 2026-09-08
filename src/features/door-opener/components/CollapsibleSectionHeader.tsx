/**
 * 삼성 스마트싱스 앱에서 방(거실/세탁실 등)마다 붙는 섹션 헤더를 참고한 컴포넌트.
 * 제목 + 개수 + chevron을 한 행에 두고, 행 전체를 탭하면 그 아래 카드 그리드가
 * 접히고 펼쳐집니다. "개폐기 카드"와 "벌 마릿수 제어" 두 섹션에서 같은 스타일로 씁니다.
 */
import { Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";

export function CollapsibleSectionHeader({
  title,
  count,
  collapsed,
  onToggleCollapsed,
  accessory,
}: {
  title: string;
  count?: number;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** 삭제/추가 버튼처럼 헤더 오른쪽에 얹는 추가 액션. */
  accessory?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onToggleCollapsed}
      className="mb-3 flex-row items-center justify-between active:opacity-70"
    >
      <View className="flex-row items-center" style={{ gap: 6 }}>
        <PretendardFont weight="bold" style={{ fontSize: 16.5, color: C.text }}>
          {title}
        </PretendardFont>
        {count != null && (
          <PretendardFont weight="semibold" style={{ fontSize: 14, color: C.ter }}>
            {count}
          </PretendardFont>
        )}
        <Feather
          name="chevron-up"
          size={18}
          color={C.ter}
          style={{ transform: [{ rotate: collapsed ? "180deg" : "0deg" }] }}
        />
      </View>

      {accessory}
    </Pressable>
  );
}
