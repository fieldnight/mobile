/**
 * 커뮤니티 활동 중인 농부 목록
 *
 * [데이터 흐름]
 * useActiveUsers() → GET /api/v1/community/active-users
 * → 최근 1시간 내 게시글 또는 댓글을 작성한 유저 목록 반환
 * → staleTime 1분 (실시간 성격이 강해 자주 리패치)
 *
 * [렌더링 로직]
 * 1. isLoading=true  → 오렌지 스피너 표시
 * 2. 빈 배열 반환   → 섹션 자체 숨김 (return null)
 * 3. 데이터 있음    → 가로 스크롤 아바타 리스트
 *    - profileImageUrl 있으면 실제 이미지, 없으면 색상 원형
 *    - API 응답 유저는 전부 최근 1h 활동자 → 항상 초록 dot
 *    - 아바타 색은 idx % 5 순환 (5가지 고정 컬러)
 */
import { View, ScrollView, Image, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { PretendardFont } from "@/components/PretendardFont";
import { useActiveUsers } from "@/features/community/explore";

// 프로필 이미지 없을 때 배경색 (userId 기반 순환)
const AVATAR_COLORS = ["#FFB74D", "#FFCCBC", "#A5D6A7", "#CE93D8", "#80DEEA"];

export function ActiveFarmers() {
  const { data: users, isLoading } = useActiveUsers();

  return (
    <View className="bg-white px-5 pt-4 pb-3 mb-2">
      <View className="flex-row items-center gap-1.5 mb-3">
        <Feather name="users" size={15} color="#191f28" />
        <PretendardFont weight="bold" style={{ fontSize: 15, color: "#111827" }}>
          지금 활동 중인 농부
        </PretendardFont>
      </View>

      {isLoading ? (
        <ActivityIndicator size="small" color="#f97316" style={{ alignSelf: "flex-start" }} />
      ) : !users?.length ? (
        <PretendardFont style={{ fontSize: 13, color: "#9ca3af" }}>
          지금 활동 중인 농부가 없어요
        </PretendardFont>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-3">
            {users.map((user, idx) => (
              <View key={user.userId} className="items-center gap-1.5">
                <View className="relative">
                  <View
                    className="w-[54px] h-[54px] rounded-full items-center justify-center overflow-hidden"
                    style={{ borderWidth: 2, borderColor: "#f97316" }}
                  >
                    {user.profileImageUrl ? (
                      <Image
                        source={{ uri: user.profileImageUrl }}
                        style={{ width: 54, height: 54, borderRadius: 27 }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 54,
                          height: 54,
                          backgroundColor: AVATAR_COLORS[idx % AVATAR_COLORS.length],
                          opacity: 0.7,
                        }}
                      />
                    )}
                  </View>
                  {/* 최근 1h 활동 유저이므로 항상 active dot 표시 */}
                  <View
                    className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-[2px] border-white"
                    style={{ backgroundColor: "#03b26c" }}
                  />
                </View>
                <PretendardFont
                  style={{ fontSize: 11, color: "#374151", maxWidth: 54 }}
                  numberOfLines={1}
                >
                  {user.name}
                </PretendardFont>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
