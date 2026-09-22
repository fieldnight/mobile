/**
 * 농장 상세 정보 모달
 * - farm prop이 null이면 숨김, 값이 있으면 fade 모달로 표시
 * - 재배 지역·면적·정식일·수확일 등 Row 형태로 나열
 * - 배경 탭 또는 X 버튼으로 닫기
 */
import { View, Pressable, Modal } from 'react-native';
import Text from '@/components/Text';
import { Feather } from '@expo/vector-icons';
import type { UserCrop } from '@/types/farm';

interface Props {
  farm: UserCrop | null;
  onClose: () => void;
}

const formatDate = (date: string | null) => {
  if (!date) return '-';
  const [y, m, d] = date.split('-');
  return `${y}년 ${m}월 ${d}일`;
};

const getCultivationLabel = (type: string) =>
  type === 'CONTROLLED' ? '시설재배' : '노지재배';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-4 border-b border-gray-100">
      <Text className="text-base text-gray-800">{label}</Text>
      <Text
        className="flex-1 ml-4 text-base font-semibold text-gray-900 text-right"
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {value}
      </Text>
    </View>
  );
}

export default function FarmDetailModal({ farm, onClose }: Props) {
  return (
    <Modal
      visible={farm !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 bg-black/50 items-center justify-center px-5"
        onPress={onClose}
      >
        {farm && (
          <Pressable className="w-full" onPress={(e) => e.stopPropagation()}>
            <View className="bg-white rounded-3xl overflow-hidden">
              {/* 헤더 */}
              <View className="flex-row items-center px-6 pt-7 pb-5">
                <View className="w-14 h-14 rounded-2xl bg-blue-50 items-center justify-center mr-4">
                  <Feather
                    name={farm.cultivationType === 'CONTROLLED' ? 'home' : 'sun'}
                    size={26}
                    color="#3B82F6"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-bold text-gray-900">
                    {farm.name || '이름 없음'}
                    {farm.variety ? ` · ${farm.variety}` : ''}
                  </Text>
                  <Text className="text-sm text-gray-800 mt-1">
                    {getCultivationLabel(farm.cultivationType)}
                  </Text>
                </View>
                <Pressable
                  onPress={onClose}
                  className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
                >
                  <Feather name="x" size={17} color="#6B7280" />
                </Pressable>
              </View>

              <View className="h-px bg-gray-100" />

              {/* 상세 정보 */}
              <View className="px-6 pt-2 pb-7">
                <Row label="재배 지역" value={farm.cultivationAddress || '-'} />
                <Row label="재배 면적" value={`${farm.cultivationArea}평`} />
                <Row label="정식일" value={formatDate(farm.plantingDate)} />
                <Row label="수확 시작일" value={formatDate(farm.harvestStartDate)} />
                <Row label="수확 마감일" value={formatDate(farm.harvestEndDate)} />
              </View>
            </View>
          </Pressable>
        )}
      </Pressable>
    </Modal>
  );
}
