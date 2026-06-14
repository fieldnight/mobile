/**
 * 커뮤니티 활동 중인 농부 목록
 * - 가로 스크롤 아바타 + 이름 + 게시글 수 표시
 * - 활동 중(active) 여부에 따라 테두리 색상 및 초록 dot 표시
 */
import { View, ScrollView, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ACTIVE_FARMERS } from "@/constants/community";
import { PretendardFont } from "@/components/PretendardFont";

export function ActiveFarmers() {
  return (
    <View className="bg-white px-5 pt-4 pb-3 mb-2">
      <View className="flex-row items-center gap-1.5 mb-3">
        <Feather name="users" size={15} color="#191f28" />
        <PretendardFont weight="bold" style={{ fontSize: 15, color: "#111827" }}>
          지금 활동 중인 농부
        </PretendardFont>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-3">
          {ACTIVE_FARMERS.map((f) => (
            <Pressable key={f.id} className="items-center gap-1.5">
              <View className="relative">
                <View
                  className="w-[54px] h-[54px] rounded-full items-center justify-center overflow-hidden"
                  style={{
                    backgroundColor: "#f2f4f6",
                    borderWidth: 2,
                    borderColor: f.active ? "#f97316" : "#e5e8eb",
                  }}
                >
                  <View
                    className="w-full h-full"
                    style={{ backgroundColor: f.color, opacity: 0.7 }}
                  />
                </View>
                {f.active && (
                  <View
                    className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-[2px] border-white"
                    style={{ backgroundColor: "#03b26c" }}
                  />
                )}
              </View>
              <PretendardFont
                style={{ fontSize: 11, color: "#374151", maxWidth: 54 }}
                numberOfLines={1}
              >
                {f.name}
              </PretendardFont>
              <PretendardFont style={{ fontSize: 10, color: "#9ca3af", marginTop: -4 }}>
                게시글 {f.postCount}
              </PretendardFont>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
