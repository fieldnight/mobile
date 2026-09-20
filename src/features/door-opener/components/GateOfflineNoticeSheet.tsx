import { Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { BottomSheet } from "@/components/BottomSheet";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";

interface GateOfflineNoticeSheetProps {
  visible: boolean;
  onClose: () => void;
  onHideToday: () => void;
  onHideForever: () => void;
}

/**
 * 개폐기 화면(오프라인/NFC 모드)에 처음 들어왔을 때 띄우는 안내 팝업.
 * 재부팅 후 폰 태그로 시간을 맞춰야 출입 통계가 정상 기록된다는 점을 안내합니다.
 */
export function GateOfflineNoticeSheet({
  visible,
  onClose,
  onHideToday,
  onHideForever,
}: GateOfflineNoticeSheetProps) {
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="개폐기 시간 동기화 안내"
      snapHeight={0.5}
    >
      <View className="rounded-2xl p-4" style={{ backgroundColor: C.infoBg }}>
        <View className="mb-3 h-11 w-11 items-center justify-center rounded-full bg-white">
          <Feather name="clock" size={21} color={C.gatePrimary} />
        </View>
        <PretendardFont weight="bold" style={{ fontSize: 18, lineHeight: 26, color: C.text }}>
          처음 켜거나 재부팅했다면 꼭 폰을 태그해주세요
        </PretendardFont>
        <PretendardFont
          weight="semibold"
          style={{ marginTop: 10, fontSize: 14, lineHeight: 22, color: C.textAlt }}
        >
          개폐기를 처음 켜거나 재부팅한 경우, 폰을 태그해 시간을 맞춰야 출입 통계가
          정상적으로 기록돼요. 시간이 맞지 않으면 출입 기록이 쌓이지 않으니 꼭
          확인해주세요.
        </PretendardFont>
      </View>

      <View className="mt-6 flex-row gap-2.5">
        <Pressable
          onPress={onHideToday}
          className="flex-1 items-center rounded-2xl py-4 active:opacity-75"
          style={{ backgroundColor: C.bgAlt }}
        >
          <PretendardFont weight="bold" style={{ fontSize: 14, color: C.textAlt }}>
            오늘 하루 보지 않기
          </PretendardFont>
        </Pressable>
        <Pressable
          onPress={onHideForever}
          className="flex-1 items-center rounded-2xl py-4 active:opacity-75"
          style={{ backgroundColor: C.gatePrimary }}
        >
          <PretendardFont weight="bold" style={{ fontSize: 14, color: C.white }}>
            그만 보기
          </PretendardFont>
        </Pressable>
      </View>
    </BottomSheet>
  );
}
