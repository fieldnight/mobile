import { Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { BottomSheet } from "@/components/BottomSheet";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";

interface NoticeAction {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
}

interface NoticeBottomSheetProps {
  visible: boolean;
  title: string;
  message: string;
  icon?: keyof typeof Feather.glyphMap;
  snapHeight?: number;
  onClose: () => void;
  actions: NoticeAction[];
}

/**
 * 로그인 필요, 개발 중 안내처럼 짧은 상태 안내에 쓰는 공용 바텀시트입니다.
 * 버튼 배열만 바꾸면 같은 UI 톤으로 여러 안내 모달을 관리할 수 있습니다.
 */
export function NoticeBottomSheet({
  visible,
  title,
  message,
  icon = "info",
  snapHeight = 0.38,
  onClose,
  actions,
}: NoticeBottomSheetProps) {
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      snapHeight={snapHeight}
      contentScrollEnabled={false}
    >
      <View className="rounded-2xl border border-white/50 bg-white/70 p-4">
        <View className="flex-row items-center gap-3">
          <View
            className="h-11 w-11 items-center justify-center rounded-full"
            style={{ backgroundColor: C.infoBg }}
          >
            <Feather name={icon} size={20} color={C.primary} />
          </View>
          <PretendardFont
            weight="medium"
            className="flex-1 text-[15px] leading-[23px]"
            style={{ color: C.textAlt }}
          >
            {message}
          </PretendardFont>
        </View>
      </View>

      <View className="mt-5 gap-3">
        {actions.map((action) => {
          const primary = action.variant !== "secondary";
          return (
            <Pressable
              key={action.label}
              onPress={action.onPress}
              className="items-center rounded-2xl py-4 active:opacity-80"
              style={{ backgroundColor: primary ? C.primary : C.bgAlt }}
            >
              <PretendardFont
                weight="bold"
                style={{ fontSize: 15, color: primary ? C.white : C.textAlt }}
              >
                {action.label}
              </PretendardFont>
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}
