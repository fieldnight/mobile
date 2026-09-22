import { useState } from 'react';
import { View, TextInput, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { api } from '@/lib/api';
import { PretendardFont } from '@/components/PretendardFont';

interface PhoneVerificationProps {
  onVerified: (phoneNumber: string) => void;
}

export function PhoneVerification({ onVerified }: PhoneVerificationProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSend = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('알림', '전화번호를 입력해주세요');
      return;
    }
    if (!/^010\d{8}$/.test(phoneNumber)) {
      Alert.alert('알림', '전화번호 형식이 올바르지 않습니다 (01012345678)');
      return;
    }
    setIsSending(true);
    try {
      await api.post('/api/v1/auth/phone/send', { phoneNumber });
      setIsVerificationSent(true);
      setIsVerified(false);
      setVerificationCode('');
      Alert.alert('알림', '인증번호가 발송되었습니다');
    } catch (error: any) {
      const message = error.response?.data?.message || 'SMS 발송에 실패했습니다';
      Alert.alert('오류', message);
    } finally {
      setIsSending(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode.trim()) {
      Alert.alert('알림', '인증번호를 입력해주세요');
      return;
    }
    if (!/^\d{6}$/.test(verificationCode)) {
      Alert.alert('알림', '인증번호 6자리를 입력해주세요');
      return;
    }
    setIsVerifying(true);
    try {
      const response = await api.post('/api/v1/auth/phone/verify', {
        phoneNumber,
        authCode: verificationCode,
      });
      if (response.data?.data?.verified) {
        setIsVerified(true);
        onVerified(phoneNumber);
        Alert.alert('알림', '전화번호 인증이 완료되었습니다');
      } else {
        Alert.alert('오류', '인증번호가 일치하지 않습니다');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || '인증번호 확인에 실패했습니다';
      Alert.alert('오류', message);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <View>
      <PretendardFont weight="semibold" className="text-base text-gray-900 mb-2">전화번호</PretendardFont>
      <View className="flex-row gap-2">
        <TextInput
          value={phoneNumber}
          onChangeText={(text) => setPhoneNumber(text.replace(/[^0-9]/g, ''))}
          placeholder="01012345678"
          keyboardType="phone-pad"
          maxLength={11}
          editable={!isVerified}
          className="flex-1 px-4 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 text-base"
          placeholderTextColor="#9ca3af"
          style={{ height: 52 }}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={isSending || isVerified}
          className="justify-center items-center px-4 rounded-xl"
          style={{ height: 52, backgroundColor: isVerified ? '#9ca3af' : '#3b82f6', minWidth: 96 }}
        >
          {isSending
            ? <ActivityIndicator size="small" color="#fff" />
            : <PretendardFont weight="semibold" className="text-white text-sm">
                {isVerificationSent ? '재발송' : '인증번호 받기'}
              </PretendardFont>
          }
        </TouchableOpacity>
      </View>

      {isVerificationSent && !isVerified && (
        <View className="mt-2 flex-row gap-2">
          <TextInput
            value={verificationCode}
            onChangeText={setVerificationCode}
            placeholder="인증번호 6자리 입력"
            keyboardType="number-pad"
            maxLength={6}
            className="flex-1 px-4 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 text-base"
            placeholderTextColor="#9ca3af"
            style={{ height: 52 }}
          />
          <TouchableOpacity
            onPress={handleVerify}
            disabled={isVerifying}
            className="justify-center items-center px-4 rounded-xl"
            style={{ height: 52, backgroundColor: '#10b981', minWidth: 72 }}
          >
            {isVerifying
              ? <ActivityIndicator size="small" color="#fff" />
              : <PretendardFont weight="semibold" className="text-white text-sm">확인</PretendardFont>
            }
          </TouchableOpacity>
        </View>
      )}
      {isVerified && (
        <PretendardFont className="text-green-600 text-sm mt-1 ml-1">전화번호 인증이 완료되었습니다</PretendardFont>
      )}
    </View>
  );
}
