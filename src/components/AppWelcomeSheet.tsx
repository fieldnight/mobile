import { Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { BottomSheet } from "@/components/BottomSheet";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";

interface AppWelcomeSheetProps {
  visible: boolean;
  onClose: () => void;
  onHideToday: () => void;
  onHideForever: () => void;
}

export function AppWelcomeSheet({
  visible,
  onClose,
  onHideToday,
  onHideForever,
}: AppWelcomeSheetProps) {
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="위비에 오신 걸 환영해요"
      snapHeight={0.78}
    >
      <View className="rounded-2xl p-4" style={{ backgroundColor: C.infoBg }}>
        <View className="mb-3 h-11 w-11 items-center justify-center rounded-full bg-white">
          <Feather name="heart" size={21} color={C.primary} />
        </View>
        <PretendardFont
          weight="bold"
          style={{ fontSize: 20, lineHeight: 28, color: C.text }}
        >
          수정벌 관리, 이제 손안에서 같이 챙겨요
        </PretendardFont>
        <PretendardFont
          weight="semibold"
          style={{ marginTop: 10, fontSize: 14, lineHeight: 22, color: C.textAlt }}
        >
          벌통과 연동하면 수정벌 상태를 확인하고, 필요한 제어를 바로 할 수 있어요.
          NFC 카드로 개폐기 설정을 전달하고, 상황에 맞춰 더 안정적으로 준비할 수 있어요.
        </PretendardFont>
      </View>

      <View className="mt-4 gap-3">
        <WelcomePoint
          icon="clock"
          title="시간표에 맞춘 개폐기 제어"
          body="지연 시간, 시간대, 24시간 교대, 농약 방제 기간에 맞춰 개폐기를 안전하게 관리할 수 있어요."
        />
        <WelcomePoint
          icon="bar-chart-2"
          title="데이터가 쌓일수록 똑똑해져요"
          body="상품 사용 데이터가 쌓이면 수익 예측, 벌통 최적화 리포트 같은 기능을 이어서 만들 수 있어요."
        />
        <WelcomePoint
          icon="message-circle"
          title="아이디어는 언제나 환영해요"
          body="궁금한 점이나 좋은 아이디어가 생기면 문의하기로 편하게 알려주세요. 둘러보기 카드에서 먼저 기능을 살펴봐도 좋아요."
        />
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
          style={{ backgroundColor: C.primary }}
        >
          <PretendardFont weight="bold" style={{ fontSize: 14, color: C.white }}>
            그만 보기
          </PretendardFont>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

function WelcomePoint({
  icon,
  title,
  body,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  body: string;
}) {
  return (
    <View className="flex-row gap-3 rounded-2xl bg-white p-4">
      <View
        className="h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: C.bgAlt }}
      >
        <Feather name={icon} size={17} color={C.primary} />
      </View>
      <View className="flex-1">
        <PretendardFont weight="bold" style={{ fontSize: 14, color: C.text }}>
          {title}
        </PretendardFont>
        <PretendardFont
          weight="medium"
          style={{ marginTop: 5, fontSize: 13, lineHeight: 20, color: C.sec }}
        >
          {body}
        </PretendardFont>
      </View>
    </View>
  );
}
