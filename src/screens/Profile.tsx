import { useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import Text from "@/components/Text";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useAuthStore } from "@/stores/useAuthStore";
import { useFarmList } from "@/features/farm";
import { useUploadProfileImage } from "@/features/user";
import type { UserCrop } from "@/types/farm";
import FarmDetailModal from "@/components/FarmDetailModal";

const PAGE_SIZE = 3;

export default function Profile() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const { data: farms = [], isLoading: farmsLoading } = useFarmList();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedFarm, setSelectedFarm] = useState<UserCrop | null>(null);
  const { mutate: uploadProfileImage, isPending: isUploading } =
    useUploadProfileImage();

  const userName = user?.fullName || user?.username || "사용자";

  const handleProfileImagePress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("권한 필요", "사진 접근 권한이 필요합니다.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (result.canceled || !result.assets[0]) return;

    uploadProfileImage(result.assets[0].uri, {
      onSuccess: (profileImageUrl) => {
        if (user) setUser({ ...user, profileImageUrl });
      },
      onError: (error) => {
        Alert.alert("오류", "프로필 사진 업로드에 실패했습니다.");
        if (__DEV__) console.warn("Profile image upload failed", error);
      },
    });
  };

  const handleAddFarmland = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/add-farm");
  };

  return (
    <View className="flex-1">
      <ScrollView
        className="flex-1 bg-gray-100"
        showsVerticalScrollIndicator={false}
      >
        {/* 프로필 섹션 */}
        <View className="px-4 pt-4 mb-4 gap-2">
          {/* 이미지 + 이름 */}
          <View className="flex-row items-center bg-white rounded-2xl p-5">
            <Pressable
              onPress={handleProfileImagePress}
              disabled={isUploading}
              className="mr-3"
            >
              <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gray-100">
                {isUploading ? (
                  <ActivityIndicator size="small" color="#8E8E93" />
                ) : user?.profileImageUrl ? (
                  <Image
                    source={{ uri: user.profileImageUrl }}
                    className="h-16 w-16"
                  />
                ) : (
                  <Feather name="user" size={32} color="#8E8E93" />
                )}
              </View>
              {/* 카메라 배지 */}
              {!isUploading && (
                <View className="absolute bottom-0 right-0 h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gray-500">
                  <Feather name="camera" size={11} color="#fff" />
                </View>
              )}
            </Pressable>
            <Text className="text-lg font-semibold text-gray-900">
              {userName}님
            </Text>
          </View>

          {/* 프로필 관리 버튼 */}
          <Pressable className="flex-row items-center bg-white rounded-2xl px-4 py-4 active:bg-gray-50">
            <Feather name="edit-2" size={16} color="#6B7280" />
            <Text className="ml-3 flex-1 text-base font-medium text-gray-700">
              프로필 관리
            </Text>
            <Feather name="chevron-right" size={16} color="#C7C7CC" />
          </Pressable>
        </View>

        {/* 내 농지 섹션 */}
        <View className="mb-4">
          <View className="px-5 mb-2">
            <Text className="text-xs font-semibold text-gray-600">내 농지</Text>
          </View>

          <View className="mx-4 bg-white rounded-2xl overflow-hidden">
            {farmsLoading ? (
              <View className="p-4 items-center">
                <Text className="text-sm text-gray-600">로딩중...</Text>
              </View>
            ) : (
              <>
                <Pressable
                  onPress={handleAddFarmland}
                  className="flex-row items-center px-4 py-4 active:bg-gray-50"
                >
                  <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                    <Feather name="plus" size={17} color="#6B7280" />
                  </View>
                  <Text className="flex-1 text-base font-semibold text-gray-600">
                    농지 추가
                  </Text>
                </Pressable>
                {farms.slice(0, visibleCount).map((farm, index) => (
                  <View key={farm.id}>
                    <View className="h-px bg-gray-100 mx-4" />
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedFarm(farm);
                      }}
                      className="flex-row items-center px-4 py-4 active:bg-gray-50"
                    >
                      <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                        <Feather
                          name={
                            farm.cultivationType === "CONTROLLED"
                              ? "home"
                              : "sun"
                          }
                          size={17}
                          color="#3B82F6"
                        />
                      </View>
                      <View className="flex-1 mr-2">
                        <Text
                          className="text-base font-semibold text-gray-900"
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {farm.name || "이름 없음"}
                          {farm.variety ? ` · ${farm.variety}` : ""}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={16} color="#C7C7CC" />
                    </Pressable>
                  </View>
                ))}
                {farms.length > visibleCount && (
                  <>
                    <View className="h-px bg-gray-100" />
                    <Pressable
                      onPress={() => setVisibleCount((v) => v + PAGE_SIZE)}
                      className="items-center py-4 active:bg-gray-50"
                    >
                      <Text className="text-base font-medium text-blue-500">더보기</Text>
                    </Pressable>
                  </>
                )}
              </>
            )}
          </View>
        </View>
      </ScrollView>

      <FarmDetailModal
        farm={selectedFarm}
        onClose={() => setSelectedFarm(null)}
      />
    </View>
  );
}
