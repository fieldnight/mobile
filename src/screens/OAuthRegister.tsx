import { useState } from 'react';
import { View, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import { Button } from '@/components/Button';
import { ConsentCheckRow } from '@/components/ConsentCheckRow';
import { LegalNoticeModal } from '@/components/LegalNoticeModal';
import { PhoneVerification } from '@/components/PhoneVerification';
import { PretendardFont } from '@/components/PretendardFont';
import {
  AGE_CONFIRM_DESCRIPTION,
  REQUIRED_CONSENT_DESCRIPTION,
  type LegalNoticeKey,
} from '@/lib/complianceNotices';

export default function OAuthRegisterScreen() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAgeConfirmed, setIsAgeConfirmed] = useState(false);
  const [isRequiredConsentChecked, setIsRequiredConsentChecked] = useState(false);
  const [legalNoticeType, setLegalNoticeType] = useState<LegalNoticeKey | null>(null);

  const handleRegister = async () => {
    if (!phoneNumber) {
      Alert.alert('알림', '전화번호 인증을 완료해주세요');
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

        <View className="mt-6 gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-4">
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
      </View>

      <View className="px-6 pb-10">
        <Button onPress={handleRegister} loading={isLoading}>
          완료
        </Button>
      </View>
      <LegalNoticeModal
        type={legalNoticeType}
        onClose={() => setLegalNoticeType(null)}
      />
    </SafeAreaView>
  );
}
