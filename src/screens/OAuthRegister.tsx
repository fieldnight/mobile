import { useState } from 'react';
import { View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import { Button } from '@/components/Button';
import { PhoneVerification } from '@/components/PhoneVerification';
import { PretendardFont } from '@/components/PretendardFont';

export default function OAuthRegisterScreen() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!phoneNumber) {
      Alert.alert('알림', '전화번호 인증을 완료해주세요');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/api/v1/oauth/register', { phoneNumber });
      router.replace('/home');
    } catch (error: any) {
      const message = error.response?.data?.message || '정보 등록에 실패했습니다';
      Alert.alert('오류', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-1 px-6 pt-10">
        <PretendardFont weight="bold" className="text-2xl text-gray-900 mb-2">추가 정보 입력</PretendardFont>
        <PretendardFont className="text-base text-gray-500 mb-10">서비스 이용을 위해 전화번호를 입력해주세요</PretendardFont>

        <PhoneVerification onVerified={setPhoneNumber} />
      </View>

      <View className="px-6 pb-10">
        <Button onPress={handleRegister} loading={isLoading}>
          완료
        </Button>
      </View>
    </SafeAreaView>
  );
}
