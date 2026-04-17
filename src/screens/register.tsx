import { useState } from 'react';
import { View, Text, TextInput, Alert, Pressable, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/useAuthStore';
import { Button } from '@/components/Button';
import { useKeyboard } from '@/hooks/useKeyboard';

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
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerificationSent, setIsVerificationSent] = useState(false);

  const handleSendVerification = () => {
    if (!formData.phoneNumber.trim()) {
      Alert.alert('알림', '전화번호를 입력해주세요');
      return;
    }
    if (!/^010\d{8}$/.test(formData.phoneNumber)) {
      Alert.alert('알림', '전화번호 형식이 올바르지 않습니다 (01012345678)');
      return;
    }
    Alert.alert('알림', 'SMS 인증 서비스는 준비 중입니다');
    setIsVerificationSent(true);
  };

  const handleRegister = async () => {
    if (!formData.username.trim()) {
      Alert.alert('알림', '아이디를 입력해주세요');
      return;
    }
    if (!formData.name.trim()) {
      Alert.alert('알림', '닉네임을 입력해주세요');
      return;
    }
    if (!formData.phoneNumber.trim()) {
      Alert.alert('알림', '전화번호를 입력해주세요');
      return;
    }
    if (!/^010\d{8}$/.test(formData.phoneNumber)) {
      Alert.alert('알림', '전화번호 형식이 올바르지 않습니다 (01012345678)');
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
      {/* Header */}
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
          <Text className="text-gray-900 text-3xl font-bold">회원가입</Text>
        </View>

        <View className="gap-5">
          {/* 아이디 */}
          <View>
            <Text className="text-base font-semibold text-gray-900 mb-2">아이디</Text>
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

          {/* 닉네임 */}
          <View>
            <Text className="text-base font-semibold text-gray-900 mb-2">닉네임</Text>
            <TextInput
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="닉네임을 입력하세요"
              className="w-full h-13 px-4 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 text-base"
              placeholderTextColor="#9ca3af"
              style={{ height: 52 }}
            />
          </View>

          {/* 전화번호 + 인증 */}
          <View>
            <Text className="text-base font-semibold text-gray-900 mb-2">전화번호</Text>
            <View className="flex-row gap-2">
              <TextInput
                value={formData.phoneNumber}
                onChangeText={(text) => setFormData({ ...formData, phoneNumber: text.replace(/[^0-9]/g, '') })}
                placeholder="01012345678"
                keyboardType="phone-pad"
                maxLength={11}
                className="flex-1 px-4 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 text-base"
                placeholderTextColor="#9ca3af"
                style={{ height: 52 }}
              />
              <TouchableOpacity
                onPress={handleSendVerification}
                className="justify-center items-center px-4 rounded-xl"
                style={{ height: 52, backgroundColor: '#3b82f6', minWidth: 96 }}
              >
                <Text className="text-white font-semibold text-sm">인증번호 받기</Text>
              </TouchableOpacity>
            </View>

            {isVerificationSent && (
              <View className="mt-2">
                <TextInput
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  placeholder="인증번호 6자리 입력"
                  keyboardType="number-pad"
                  maxLength={6}
                  className="w-full px-4 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 text-base"
                  placeholderTextColor="#9ca3af"
                  style={{ height: 52 }}
                />
                <Text className="text-xs text-gray-400 mt-1 ml-1">SMS 인증 서비스 준비 중입니다</Text>
              </View>
            )}
          </View>

          {/* 비밀번호 */}
          <View>
            <Text className="text-base font-semibold text-gray-900 mb-2">비밀번호</Text>
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

          {/* 비밀번호 확인 */}
          <View>
            <Text className="text-base font-semibold text-gray-900 mb-2">비밀번호 확인</Text>
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
              <Text className="text-red-500 text-sm mt-1 ml-1">비밀번호가 일치하지 않습니다</Text>
            )}
          </View>

          <View className="flex-row justify-center items-center mt-2">
            <Text className="text-gray-600 text-base">이미 계정이 있으신가요? </Text>
            <Pressable onPress={() => router.back()}>
              <Text className="text-blue-600 font-semibold text-base">로그인</Text>
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
    </SafeAreaView>
  );
}
