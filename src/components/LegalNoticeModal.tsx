import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { PretendardFont } from '@/components/PretendardFont';
import { LEGAL_NOTICES, type LegalNoticeKey } from '@/lib/complianceNotices';

interface LegalNoticeModalProps {
  type: LegalNoticeKey | null;
  onClose: () => void;
}

export function LegalNoticeModal({ type, onClose }: LegalNoticeModalProps) {
  const notice = type ? LEGAL_NOTICES[type] : null;

  return (
    <Modal
      visible={Boolean(notice)}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/45">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="max-h-[86%] rounded-t-[28px] bg-white px-5 pb-5 pt-4">
          <View className="mb-4 flex-row items-center">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-50">
              <Feather name="file-text" size={19} color="#2563EB" />
            </View>
            <View className="ml-3 flex-1">
              <PretendardFont weight="bold" className="text-[18px] text-gray-950">
                {notice?.title}
              </PretendardFont>
              <PretendardFont className="mt-0.5 text-[12px] text-gray-500">
                시행일 {notice?.updatedAt}
              </PretendardFont>
            </View>
            <Pressable
              onPress={onClose}
              className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:opacity-70"
            >
              <Feather name="x" size={19} color="#4B5563" />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerClassName="gap-4 pb-4"
          >
            {notice?.sections.map((section) => (
              <View key={section.title} className="rounded-2xl bg-gray-50 px-4 py-3.5">
                <PretendardFont weight="bold" className="text-[14px] text-gray-950">
                  {section.title}
                </PretendardFont>

                {section.body ? (
                  <PretendardFont className="mt-2 text-[13px] leading-5 text-gray-700">
                    {section.body}
                  </PretendardFont>
                ) : null}

                {section.items?.length ? (
                  <View className="mt-2 gap-1.5">
                    {section.items.map((item) => (
                      <View key={item} className="flex-row items-start gap-2">
                        <View className="mt-[7px] h-1.5 w-1.5 rounded-full bg-blue-500" />
                        <PretendardFont className="flex-1 text-[13px] leading-5 text-gray-700">
                          {item}
                        </PretendardFont>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
