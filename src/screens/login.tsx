import { useState } from 'react';
import { Pressable, View, Image, TextInput, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { useAuthStore } from '@/stores/useAuthStore';
import { Button } from '@/components/Button';
import { LegalNoticeModal } from '@/components/LegalNoticeModal';
import { PretendardFont } from '@/components/PretendardFont';
import { useKeyboard } from '@/hooks/useKeyboard';
import { type LegalNoticeKey } from '@/lib/complianceNotices';

const KAKAO_REST_API_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY;
const NAVER_CLIENT_ID = process.env.EXPO_PUBLIC_NAVER_CLIENT_ID;
const API_BASE = Constants.expoConfig?.extra?.apiUrl || 'https://webeelab.site';
const TEST_ACCOUNT = {
  username: process.env.EXPO_PUBLIC_TEST_USERNAME || 'minari02',
  password: process.env.EXPO_PUBLIC_TEST_PASSWORD || 'qwe123!@#',
};

function getLoginErrorMessage(error: any, fallback: string) {
  if (error?.code === 'ECONNABORTED' || String(error?.message ?? '').includes('timeout')) {
    return '서버 응답이 지연되고 있어요. 잠시 후 다시 시도해주세요.';
  }

  if (!error?.response) {
    return '서버에 연결하지 못했어요. 네트워크 상태나 서버 주소를 확인해주세요.';
  }

  return error.response?.data?.message || fallback;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface SocialButtonProps {
  icon: React.ReactNode;
  label: string;
  bgColor: string;
  textColor: string;
  borderColor?: string;
  onPress: () => void;
}

function SocialButton({ icon, label, bgColor, textColor, borderColor, onPress }: SocialButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 20, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 20, stiffness: 300 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      className={`flex-row items-center justify-center h-14 rounded-xl gap-2.5 ${borderColor ? 'border' : ''}`}
      style={[{ backgroundColor: bgColor, borderColor }, animatedStyle]}
    >
      {icon}
      <PretendardFont weight="semibold" style={{ fontSize: 16, color: textColor }}>
        {label}
      </PretendardFont>
    </AnimatedPressable>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const { login, socialLogin, isLoading } = useAuthStore();
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [legalNoticeType, setLegalNoticeType] = useState<LegalNoticeKey | null>(null);

  const getLoginDestination = () => {
    if (redirect && redirect !== '/login') return redirect as any;
    return '/home';
  };

  const submitLogin = async (
    credentials: { username: string; password: string },
    fallbackMessage: string,
  ) => {
    try {
      await login({
        username: credentials.username.trim(),
        password: credentials.password,
      });
      router.replace(getLoginDestination());
    } catch (error: any) {
      console.error('[Login] 로그인 실패', {
        username: credentials.username,
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
        error,
      });
      const message = getLoginErrorMessage(error, fallbackMessage);
      Alert.alert('로그인 실패', message);
    }
  };

  const handleSocialLogin = async (provider: 'KAKAO' | 'NAVER') => {
    try {
      const callbackUri = `${API_BASE}/api/v1/oauth/callback/${provider}`;
      let authUrl = '';

      if (provider === 'KAKAO') {
        authUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_REST_API_KEY}&redirect_uri=${encodeURIComponent(callbackUri)}&response_type=code`;
      } else {
        authUrl = `https://nid.naver.com/oauth2.0/authorize?client_id=${NAVER_CLIENT_ID}&redirect_uri=${encodeURIComponent(callbackUri)}&response_type=code&state=WEBEE`;
      }

      const result = await WebBrowser.openAuthSessionAsync(authUrl, 'webee://oauth');

      if (result.type !== 'success') return;

      const parsed = Linking.parse(result.url);
      const code = parsed.queryParams?.code as string;
      const platform = (parsed.queryParams?.platform as 'KAKAO' | 'NAVER') ?? provider;

      if (!code) {
        Alert.alert('오류', '인가 코드를 받지 못했습니다');
        return;
      }

      const result2 = await socialLogin(platform, code);
      if (result2.isNewUser) {
        router.replace('/oauth-register');
      } else {
        router.replace(getLoginDestination());
      }
    } catch (error: any) {
      console.error('[Login] 소셜 로그인 실패', {
        provider,
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
        error,
      });
      const message = getLoginErrorMessage(error, '소셜 로그인에 실패했습니다');
      Alert.alert('로그인 실패', message);
    }
  };

  const handleEmailLogin = async () => {
    if (!username.trim()) {
      Alert.alert('알림', '아이디를 입력해주세요');
      return;
    }
    if (!password) {
      Alert.alert('알림', '비밀번호를 입력해주세요');
      return;
    }

    await submitLogin({ username, password }, '로그인에 실패했습니다');
  };

  const handleTestLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await submitLogin(TEST_ACCOUNT, '테스트 계정 로그인에 실패했습니다');
  };

  const handleGoToRegister = () => {
    router.push('/register');
  };

  const handleBackToHome = () => {
    router.replace('/home');
  };

  const { isVisible: isKeyboardVisible, keyboardHeight } = useKeyboard();
  const insets = useSafeAreaInsets();

  if (showEmailLogin) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View className="px-4 py-2">
          <Pressable
            onPress={() => setShowEmailLogin(false)}
            className="w-11 h-11 items-center justify-center"
          >
            <Feather name="arrow-left" size={24} color="#000" />
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: 24,
            paddingBottom: isKeyboardVisible ? keyboardHeight + 100 : 120
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center mb-10">
            <Image
              source={require('../../assets/branding/webee_logo.png')}
              style={{ width: 80, height: 80 }}
              resizeMode="contain"
            />
            <PretendardFont weight="bold" className="text-2xl text-black mt-4">로그인</PretendardFont>
          </View>

          <View className="gap-5">
            <View>
              <PretendardFont weight="semibold" className="text-base text-gray-900 mb-2">아이디</PretendardFont>
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="아이디를 입력하세요"
                autoCapitalize="none"
                autoCorrect={false}
                className="w-full px-4 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 text-base"
                placeholderTextColor="#9ca3af"
                style={{ height: 52 }}
              />
            </View>

            <View>
              <PretendardFont weight="semibold" className="text-base text-gray-900 mb-2">비밀번호</PretendardFont>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="비밀번호를 입력하세요"
                secureTextEntry
                className="w-full px-4 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 text-base"
                placeholderTextColor="#9ca3af"
                style={{ height: 52 }}
              />
            </View>

            <View className="flex-row justify-center items-center mt-2">
              <PretendardFont className="text-gray-600 text-base">계정이 없으신가요? </PretendardFont>
              <Pressable onPress={handleGoToRegister}>
                <PretendardFont weight="semibold" className="text-blue-600 text-base">회원가입</PretendardFont>
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
          <Button onPress={handleEmailLogin} loading={isLoading}>
            로그인
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="absolute left-4 top-3 z-10">
        <Pressable
          onPress={handleBackToHome}
          className="h-11 w-11 items-center justify-center rounded-full active:opacity-70"
        >
          <Feather name="arrow-left" size={24} color="#111827" />
        </Pressable>
      </View>

      <View className="flex-1 justify-between pb-8">
        <Animated.View
          entering={FadeIn.delay(100).duration(500)}
          className="flex-1 justify-center items-center"
        >
          <View className="w-28 h-28 mb-6 items-center justify-center">
            <Image
              source={require('../../assets/branding/webee_logo.png')}
              style={{ width: 96, height: 96 }}
              resizeMode="contain"
            />
          </View>
          <PretendardFont weight="bold" className="text-3xl text-black tracking-tight">Webee</PretendardFont>
          <PretendardFont className="text-base text-gray-600 mt-1">수정벌 통합 관리 플랫폼</PretendardFont>
        </Animated.View>

        <Animated.View
          entering={FadeIn.delay(200).duration(500)}
          className="px-6 gap-3 mb-8"
        >
          <SocialButton
            icon={<Feather name="message-circle" size={20} color="#191600" />}
            label="카카오로 시작하기"
            bgColor="#FEE500"
            textColor="#191600"
            onPress={() => handleSocialLogin('KAKAO')}
          />

          <SocialButton
            icon={<Feather name="navigation" size={20} color="#FFFFFF" />}
            label="네이버로 시작하기"
            bgColor="#03C75A"
            textColor="#FFFFFF"
            onPress={() => handleSocialLogin('NAVER')}
          />

          <Pressable
            onPress={handleTestLogin}
            disabled={isLoading}
            className="h-16 flex-row items-center justify-center gap-2.5 rounded-2xl active:opacity-80"
            style={{
              backgroundColor: '#111827',
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            <Feather name="zap" size={21} color="#FFFFFF" />
            <PretendardFont weight="bold" style={{ fontSize: 18, color: '#FFFFFF' }}>
              테스트 계정으로 로그인
            </PretendardFont>
          </Pressable>

          <View className="flex-row items-center my-4">
            <View className="flex-1 h-px bg-gray-200" />
            <PretendardFont className="text-sm text-gray-600 mx-4">또는</PretendardFont>
            <View className="flex-1 h-px bg-gray-200" />
          </View>

          <Pressable onPress={() => setShowEmailLogin(true)} className="items-center py-3">
            <PretendardFont weight="medium" className="text-base text-blue-500">
              아이디로 로그인
            </PretendardFont>
          </Pressable>

          <Pressable onPress={handleGoToRegister} className="items-center py-1">
            <PretendardFont className="text-sm text-gray-600">
              계정이 없으신가요?{' '}
              <PretendardFont weight="medium" className="text-blue-500">회원가입</PretendardFont>
            </PretendardFont>
          </Pressable>
        </Animated.View>

        <Animated.View
          entering={FadeIn.delay(300).duration(500)}
          className="items-center px-8"
        >
          <PretendardFont className="text-sm text-gray-600 text-center leading-5">
            계속 진행하면 서비스 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
          </PretendardFont>
          <View className="mt-2 flex-row items-center justify-center gap-3">
            <Pressable onPress={() => setLegalNoticeType('terms')} className="py-1 active:opacity-70">
              <PretendardFont className="text-sm text-gray-600 underline">
                서비스 이용약관
              </PretendardFont>
            </Pressable>
            <PretendardFont className="text-sm text-gray-400">|</PretendardFont>
            <Pressable onPress={() => setLegalNoticeType('privacy')} className="py-1 active:opacity-70">
              <PretendardFont className="text-sm text-gray-600 underline">
                개인정보 처리방침
              </PretendardFont>
            </Pressable>
          </View>
        </Animated.View>
      </View>
      <LegalNoticeModal
        type={legalNoticeType}
        onClose={() => setLegalNoticeType(null)}
      />
    </SafeAreaView>
  );
}
