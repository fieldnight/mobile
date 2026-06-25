import { useState } from 'react';
import { View, ScrollView, Pressable, Switch, Alert } from 'react-native';
import Text from '@/components/Text';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PretendardFont } from '@/components/PretendardFont';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import AppHeader from '@/components/AppHeader';
import { HEADER_HEIGHT } from '@/hooks';
import InquiryModal from '@/screens/bee-chat-inquiry';

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
      className="flex-row items-center px-4 py-4 active:bg-gray-50"
    >
      <Feather
        name={icon}
        size={22}
        color={danger ? '#FF3B30' : '#8E8E93'}
        style={{ marginRight: 12 }}
      />
      <PretendardFont
        weight="regular"
        className={`flex-1 text-base ${danger ? 'text-red-500' : 'text-gray-900'}`}
      >
        {label}
      </Text>

      {rightElement || <Feather name="chevron-right" size={18} color="#C7C7CC" />}
    </Pressable>
  );
}

export default function Settings() {
  const router = useRouter();
  const { logout, withdraw } = useAuthStore();
  const { fontOffset, increaseFontSize, decreaseFontSize } = useSettingsStore();
  const [newsNotificationEnabled, setNewsNotificationEnabled] = useState(false);
  const [communityNotificationEnabled, setCommunityNotificationEnabled] = useState(false);
  const [notificationsExpanded, setNotificationsExpanded] = useState(true);
  const [inquiryVisible, setInquiryVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const handleLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
        await logout();
    } finally {
      router.replace('/login');
    }
  };

  const handleDeleteAccount = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      '계정 삭제',
      '정말 탈퇴하시겠습니까?\n탈퇴 후 데이터는 복구할 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴',
          style: 'destructive',
          onPress: async () => {
            try {
              await withdraw();
              router.replace('/login');
            } catch {
              Alert.alert('오류', '탈퇴 처리 중 문제가 발생했습니다.');
            }
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-gray-100">
      <AppHeader title="설정" onBack={() => router.back()} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: HEADER_HEIGHT + Math.max(insets.top, 12),
          paddingBottom: Math.max(insets.bottom, 24),
        }}
      >
        {/* 설정 섹션 */}
        <View className="mb-4">
          <PretendardFont weight="semibold" className="text-xs text-gray-600 mb-2 px-5">
            설정
          </PretendardFont>
          <View className="mx-4 bg-white rounded-2xl overflow-hidden">
            <MenuItem
              icon="bell"
              label="알림"
              onPress={() => setNotificationsExpanded(!notificationsExpanded)}
              rightElement={
                <Feather
                  name={notificationsExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#C7C7CC"
                />
              }
            />
            {notificationsExpanded && (
              <>
                <View className="h-px bg-gray-100 ml-11" />
                <Pressable
                  onPress={() => setNewsNotificationEnabled(!newsNotificationEnabled)}
                  className="flex-row items-center pl-11 pr-4 py-4 active:bg-gray-50"
                >
                  <PretendardFont className="flex-1 text-base text-gray-900">
                    뉴스
                  </PretendardFont>
                  <Switch
                    value={newsNotificationEnabled}
                    onValueChange={setNewsNotificationEnabled}
                    trackColor={{ false: '#E5E5EA', true: '#F59E0B' }}
                    thumbColor="#FFFFFF"
                  />
                </Pressable>
                <View className="h-px bg-gray-100 ml-11" />
                <Pressable
                  onPress={() => setCommunityNotificationEnabled(!communityNotificationEnabled)}
                  className="flex-row items-center pl-11 pr-4 py-4 active:bg-gray-50"
                >
                  <PretendardFont className="flex-1 text-base text-gray-900">
                    커뮤니티
                  </PretendardFont>
                  <Switch
                    value={communityNotificationEnabled}
                    onValueChange={setCommunityNotificationEnabled}
                    trackColor={{ false: '#E5E5EA', true: '#F59E0B' }}
                    thumbColor="#FFFFFF"
                  />
                </Pressable>
              </>
            )}
            <View className="h-px bg-gray-100 ml-11" />
            <View className="flex-row items-center px-4 py-4">
              <Feather name="type" size={20} color="#8E8E93" style={{ marginRight: 12 }} />
              <PretendardFont className="flex-1 text-base text-gray-900">
                폰트 크기
              </PretendardFont>
              <View className="flex-row items-center gap-3">
                <Pressable
                  onPress={decreaseFontSize}
                  disabled={fontOffset <= -2}
                  className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
                >
                  <Feather name="minus" size={16} color={fontOffset <= -2 ? '#C7C7CC' : '#6B7280'} />
                </Pressable>
                <Pressable
                  onPress={increaseFontSize}
                  disabled={fontOffset >= 2}
                  className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
                >
                  <Feather name="plus" size={16} color={fontOffset >= 2 ? '#C7C7CC' : '#6B7280'} />
                </Pressable>
              </View>
            </View>
            <View className="h-px bg-gray-100 ml-11" />
            <MenuItem icon="help-circle" label="문의하기" onPress={() => setInquiryVisible(true)} />
            <View className="h-px bg-gray-100 ml-11" />
            <MenuItem icon="file-text" label="이용약관" onPress={() => {}} />
            <View className="h-px bg-gray-100 ml-11" />
            <MenuItem icon="shield" label="개인정보처리방침" onPress={() => {}} />
          </View>
        </View>

        {/* 계정 섹션 */}
        <View className="mb-4">
          <PretendardFont weight="semibold" className="text-xs text-gray-600 mb-2 px-5">
            계정
          </PretendardFont>
          <View className="mx-4 bg-white rounded-2xl overflow-hidden">
            <MenuItem icon="log-out" label="로그아웃" onPress={handleLogout} />
            <View className="h-px bg-gray-100 ml-11" />
            <MenuItem icon="trash-2" label="계정 삭제" onPress={handleDeleteAccount} danger />
          </View>
        </View>

        {/* 버전 정보 */}
        <View className="items-center py-5 mb-8">
          <PretendardFont className="text-sm text-gray-600">버전 1.0.0</PretendardFont>
        </View>
      </ScrollView>
      <InquiryModal visible={inquiryVisible} onClose={() => setInquiryVisible(false)} />
    </View>
  );
}
