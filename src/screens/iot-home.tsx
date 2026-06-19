import { useState } from "react";
import { Dimensions, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import { useHiveStore } from "@/stores/useHiveStore";
import { useSyncHiveList } from "@/features/hive";
import {
  DoorOpenerBackground,
  DraggableHiveSection,
  NfcDoorCardSection,
} from "@/features/door-opener";

const SCREEN_W = Dimensions.get("window").width;
const H_PAD = 18;
const GAP = 16;
const CARD_W = (SCREEN_W - H_PAD * 2 - GAP) / 2 - 1;
const PAGE_TITLE = "\uAC1C\uD3D0\uAE30";
const PAGE_DESCRIPTION =
  "\uAC1C\uD3D0\uAE30 NFC \uCE74\uB4DC\uC640 \uB4F1\uB85D\uB41C \uBC8C\uD1B5\uC744 \uD55C\uB208\uC5D0 \uD655\uC778\uD558\uC138\uC694";

export default function DoorOpenerScreen() {
  const insets = useSafeAreaInsets();
  const hives = useHiveStore((s) => s.hives);
  const reorderHives = useHiveStore((s) => s.reorderHives);
  const [deleting, setDeleting] = useState(false);
  useSyncHiveList();

  return (
    <View className="flex-1">
      <DoorOpenerBackground />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: H_PAD,
          paddingTop: 22,
          paddingBottom: insets.bottom + 96,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(40).duration(360)} className="mb-5 ml-1">
          <PretendardFont weight="bold" style={{ fontSize: 24, color: C.white }}>
            {PAGE_TITLE}
          </PretendardFont>
          <PretendardFont
            style={{ fontSize: 13.5, color: "rgba(255,255,255,0.8)", marginTop: 3 }}
          >
            {PAGE_DESCRIPTION}
          </PretendardFont>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(380)}>
          <NfcDoorCardSection
            cardWidth={CARD_W}
            deleting={deleting}
            onToggleDeleting={() => setDeleting((value) => !value)}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(220).duration(380)}>
          <DraggableHiveSection
            hives={hives}
            cardWidth={CARD_W}
            onReorder={reorderHives}
          />
        </Animated.View>
      </ScrollView>
    </View>
  );
}
