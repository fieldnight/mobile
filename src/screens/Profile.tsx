import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/stores/useAuthStore';

interface MenuItemProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
}

function MenuItem({ icon, label, onPress, rightElement, danger = false }: MenuItemProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      className="flex-row items-center px-4 py-3 active:bg-gray-50"
    >
      <Feather
        name={icon}
        size={20}
        color={danger ? "#FF3B30" : "#8E8E93"}
        style={{ marginRight: 12 }}
      />
      <Text className={`flex-1 text-base ${danger ? 'text-red-500' : 'text-gray-900'}`}>
        {label}
      </Text>
      {rightElement || <Feather name="chevron-right" size={18} color="#C7C7CC" />}
    </Pressable>
  );
}

export default function Profile() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const userName = user?.fullName || user?.username || '사용자';

  const handleAddFarmland = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/add-farm');
  };

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    logout();
    router.replace('/login');
  };

  const handleDeleteAccount = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: 계정 삭제 확인 모달
    console.log('계정 삭제');
  };

  return (
    <ScrollView className="flex-1 bg-gray-100" showsVerticalScrollIndicator={false}>
      {/* 프로필 섹션 */}
      <View className="px-4 pt-4 mb-4">
        <Pressable className="flex-row items-center bg-white rounded-2xl p-4 active:scale-[0.98]">
          <View className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center mr-3">
            <Feather name="user" size={28} color="#8E8E93" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-semibold text-gray-900">{userName}님</Text>
            <Text className="text-sm text-gray-600 mt-0.5">프로필 관리</Text>
          </View>
          <Feather name="chevron-right" size={18} color="#C7C7CC" />
        </Pressable>
      </View>

      {/* 내 농지 섹션 */}
      <View className="mb-4">
        <Text className="text-xs font-semibold text-gray-600 mb-2 px-5">내 농지</Text>
        <View className="mx-4 bg-white rounded-2xl overflow-hidden">
          <Pressable
            className="flex-row items-center p-4 active:bg-gray-50"
            onPress={handleAddFarmland}
          >
            <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center mr-3">
              <Feather name="plus" size={20} color="#3B82F6" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900">농지 추가하기</Text>
              <Text className="text-sm text-gray-600 mt-0.5">
                농지를 등록하고 맞춤 서비스를 이용해보세요
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color="#C7C7CC" />
          </Pressable>
        </View>
      </View>

      {/* 설정 섹션 */}
      <View className="mb-4">
        <Text className="text-xs font-semibold text-gray-600 mb-2 px-5">설정</Text>
        <View className="mx-4 bg-white rounded-2xl overflow-hidden">
          <MenuItem
            icon="bell"
            label="알림"
            onPress={() => setNotificationsEnabled(!notificationsEnabled)}
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: "#E5E5EA", true: "#F59E0B" }}
                thumbColor="#FFFFFF"
              />
            }
          />
          <View className="h-px bg-gray-100 ml-11" />
          <MenuItem
            icon="globe"
            label="언어"
            onPress={() => {}}
            rightElement={
              <View className="flex-row items-center gap-1">
                <Text className="text-base text-gray-600">한국어</Text>
                <Feather name="chevron-right" size={18} color="#C7C7CC" />
              </View>
            }
          />
          <View className="h-px bg-gray-100 ml-11" />
          <MenuItem icon="help-circle" label="고객센터" onPress={() => {}} />
          <View className="h-px bg-gray-100 ml-11" />
          <MenuItem icon="file-text" label="이용약관" onPress={() => {}} />
          <View className="h-px bg-gray-100 ml-11" />
          <MenuItem icon="shield" label="개인정보처리방침" onPress={() => {}} />
        </View>
      </View>

      {/* 계정 섹션 */}
      <View className="mb-4">
        <Text className="text-xs font-semibold text-gray-600 mb-2 px-5">계정</Text>
        <View className="mx-4 bg-white rounded-2xl overflow-hidden">
          <MenuItem icon="log-out" label="로그아웃" onPress={handleLogout} />
          <View className="h-px bg-gray-100 ml-11" />
          <MenuItem icon="trash-2" label="계정 삭제" onPress={handleDeleteAccount} danger />
        </View>
      </View>

      {/* 버전 정보 */}
      <View className="items-center py-4 mb-8">
        <Text className="text-sm text-gray-600">버전 1.0.0</Text>
      </View>
    </ScrollView>
  );
}
