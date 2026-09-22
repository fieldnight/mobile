import { useState } from 'react';
import { View, TextInput, Alert, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/useAuthStore';
import { Button } from '@/components/Button';
import { ConsentCheckRow } from '@/components/ConsentCheckRow';
import { LegalNoticeModal } from '@/components/LegalNoticeModal';
import { PretendardFont } from '@/components/PretendardFont';
import { useKeyboard } from '@/hooks/useKeyboard';
import { PhoneVerification } from '@/components/PhoneVerification';
import {
  AGE_CONFIRM_DESCRIPTION,
  REQUIRED_CONSENT_DESCRIPTION,
  type LegalNoticeKey,
} from '@/lib/complianceNotices';

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    passwordConfirm: '',
    name: '',
    phoneNumber: '',
  });
  const [isAgeConfirmed, setIsAgeConfirmed] = useState(false);
  const [isRequiredConsentChecked, setIsRequiredConsentChecked] = useState(false);
  const [legalNoticeType, setLegalNoticeType] = useState<LegalNoticeKey | null>(null);

  const handleRegister = async () => {
    if (!formData.username.trim()) {
      Alert.alert('알림', '아이디를 입력해주세요');
      return;
    }
    if (!formData.name.trim()) {
      Alert.alert('알림', '닉네임을 입력해주세요');
      return;
    }
    if (!formData.phoneNumber) {
      Alert.alert('알림', '전화번호 인증을 완료해주세요');
      return;
    }
    if (!formData.password) {
      Alert.alert('알림', '비밀번호를 입력해주세요');
      return;
    }
    if (formData.password.length < 6) {
      Alert.alert('알림', '비밀번호는 6자 이상이어야 합니다');
      return;
    }
    if (formData.password !== formData.passwordConfirm) {
      Alert.alert('알림', '비밀번호가 일치하지 않습니다');
      return;
    }
    if (!isAgeConfirmed) {
      Alert.alert('알림', '만 14세 이상 여부를 확인해주세요');
      return;
    }
    if (!isRequiredConsentChecked) {
      Alert.alert('알림', '서비스 이용약관 및 개인정보 처리방침에 동의해주세요');
      return;
    }

    try {
      const { passwordConfirm, ...registerData } = formData;
      await register(registerData);
      Alert.alert('회원가입 성공', '로그인 페이지로 이동합니다', [
        { text: '확인', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      const message = error.response?.data?.message || '회원가입에 실패했습니다';
      Alert.alert('회원가입 실패', message);
    }
  };

  const { isVisible: isKeyboardVisible, keyboardHeight } = useKeyboard();
  const insets = useSafeAreaInsets();

  const passwordMismatch = formData.passwordConfirm.length > 0 && formData.password !== formData.passwordConfirm;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-row items-center px-4 py-2">
        <Pressable
          onPress={() => router.back()}
          className="w-11 h-11 items-center justify-center"
        >
          <Feather name="arrow-left" size={24} color="#000" />
        </Pressable>
        <View className="flex-1" />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 20,
          paddingBottom: isKeyboardVisible ? keyboardHeight + 100 : 120
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center mb-10">
          <PretendardFont weight="bold" className="text-gray-900 text-3xl">회원가입</PretendardFont>
        </View>

        <View className="gap-5">
          <View>
            <PretendardFont weight="semibold" className="text-base text-gray-900 mb-2">아이디</PretendardFont>
            <TextInput
              value={formData.username}
              onChangeText={(text) => setFormData({ ...formData, username: text })}
              placeholder="아이디를 입력하세요"
              autoCapitalize="none"
              className="w-full h-13 px-4 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 text-base"
              placeholderTextColor="#9ca3af"
              style={{ height: 52 }}
            />
          </View>

          <View>
            <PretendardFont weight="semibold" className="text-base text-gray-900 mb-2">닉네임</PretendardFont>
            <TextInput
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="닉네임을 입력하세요"
              className="w-full h-13 px-4 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 text-base"
              placeholderTextColor="#9ca3af"
              style={{ height: 52 }}
            />
          </View>

          <PhoneVerification
            onVerified={(phone) => setFormData({ ...formData, phoneNumber: phone })}
          />

          <View>
            <PretendardFont weight="semibold" className="text-base text-gray-900 mb-2">비밀번호</PretendardFont>
            <TextInput
              value={formData.password}
              onChangeText={(text) => setFormData({ ...formData, password: text })}
              placeholder="비밀번호를 입력하세요 (6자 이상)"
              secureTextEntry
              className="w-full px-4 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 text-base"
              placeholderTextColor="#9ca3af"
              style={{ height: 52 }}
            />
          </View>

          <View>
            <PretendardFont weight="semibold" className="text-base text-gray-900 mb-2">비밀번호 확인</PretendardFont>
            <TextInput
              value={formData.passwordConfirm}
              onChangeText={(text) => setFormData({ ...formData, passwordConfirm: text })}
              placeholder="비밀번호를 다시 입력하세요"
              secureTextEntry
              className="w-full px-4 bg-gray-50 border rounded-xl text-gray-900 text-base"
              placeholderTextColor="#9ca3af"
              style={{
                height: 52,
                borderColor: passwordMismatch ? '#ef4444' : '#d1d5db',
                backgroundColor: '#f9fafb',
              }}
            />
            {passwordMismatch && (
              <PretendardFont className="text-red-500 text-sm mt-1 ml-1">비밀번호가 일치하지 않습니다</PretendardFont>
            )}
          </View>

          <View className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3.5">
            <View className="flex-row items-center gap-2">
              <Feather name="shield" size={16} color="#2563eb" />
              <PretendardFont weight="bold" className="text-sm text-gray-900">
                가입 전 확인
              </PretendardFont>
            </View>
            <PretendardFont className="mt-2 text-xs text-gray-600 leading-5">
              선택 권한은 기능을 사용할 때만 요청됩니다. 카메라/사진, 위치, 알림, NFC 권한은 설정에서 언제든 변경할 수 있어요.
            </PretendardFont>
            <Pressable onPress={() => setLegalNoticeType('permissions')} className="mt-2 self-start py-1 active:opacity-70">
              <PretendardFont weight="semibold" className="text-xs text-blue-600">
                앱 권한 안내 보기
              </PretendardFont>
            </Pressable>
          </View>

          <View className="gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-4">
            <ConsentCheckRow
              checked={isAgeConfirmed}
              onPress={() => setIsAgeConfirmed((value) => !value)}
              title="만 14세 이상입니다"
              description={AGE_CONFIRM_DESCRIPTION}
            />
            <View className="h-px bg-gray-100" />
            <ConsentCheckRow
              checked={isRequiredConsentChecked}
              onPress={() => setIsRequiredConsentChecked((value) => !value)}
              title="서비스 이용약관 및 개인정보 처리방침에 동의합니다"
              description={REQUIRED_CONSENT_DESCRIPTION}
            />
            <View className="flex-row gap-3 pl-9">
              <Pressable onPress={() => setLegalNoticeType('terms')} className="py-1 active:opacity-70">
                <PretendardFont weight="semibold" className="text-xs text-blue-600 underline">
                  이용약관
                </PretendardFont>
              </Pressable>
              <Pressable onPress={() => setLegalNoticeType('privacy')} className="py-1 active:opacity-70">
                <PretendardFont weight="semibold" className="text-xs text-blue-600 underline">
                  개인정보 처리방침
                </PretendardFont>
              </Pressable>
            </View>
          </View>

          <View className="flex-row justify-center items-center mt-2">
            <PretendardFont className="text-gray-600 text-base">이미 계정이 있으신가요? </PretendardFont>
            <Pressable onPress={() => router.back()}>
              <PretendardFont weight="semibold" className="text-blue-600 text-base">로그인</PretendardFont>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <View
        className="absolute left-0 right-0 px-6 pt-3 bg-white"
        style={{
          bottom: isKeyboardVisible ? keyboardHeight : 0,
          paddingBottom: isKeyboardVisible ? 12 : insets.bottom + 16,
        }}
      >
        <Button onPress={handleRegister} loading={isLoading}>
          회원가입
        </Button>
      </View>
      <LegalNoticeModal
        type={legalNoticeType}
        onClose={() => setLegalNoticeType(null)}
      />
    </SafeAreaView>
  );
}
