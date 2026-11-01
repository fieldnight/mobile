import { View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import type { NfcDoorCardConfig } from "../nfcDoorCards";

interface NfcFloatingCardProps {
  card: NfcDoorCardConfig;
  active: boolean;
  width: number;
}

export function NfcFloatingCard({ card, active, width }: NfcFloatingCardProps) {
  const supportingText = card.removable && card.memo ? card.memo : card.description;

  return (
    <View
      className="overflow-hidden rounded-2xl bg-white px-6 pb-6 pt-5"
      style={{
        width,
        height: 332,
        opacity: active ? 1 : 0.62,
        transform: [{ scale: active ? 1 : 0.91 }],
        borderWidth: 1,
        borderColor: active ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.58)",
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: active ? 0.24 : 0.1,
        shadowRadius: 28,
        elevation: active ? 18 : 4,
      }}
    >
      <View className="flex-row items-center justify-between">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <Feather name={card.icon} size={22} color={C.gatePrimary} />
        </View>
        <View className="rounded-full bg-slate-100 px-3 py-2">
          <PretendardFont weight="bold" style={{ fontSize: 12.5, color: C.textAlt }}>
            {active ? "NFC 활성화" : "옆 카드"}
          </PretendardFont>
        </View>
      </View>

      <View className="mt-10 flex-1">
        <PretendardFont
          weight="bold"
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.78}
          style={{ fontSize: 32, lineHeight: 38, color: C.text }}
        >
          {card.title}
        </PretendardFont>
        <PretendardFont
          weight="semibold"
          style={{ marginTop: 8, fontSize: 15.5, lineHeight: 23, color: C.textAlt }}
        >
          {supportingText}
        </PretendardFont>

        {card.detail ? (
          <View className="mt-5 rounded-2xl bg-slate-100 px-4 py-3.5">
            <PretendardFont
              numberOfLines={3}
              style={{ fontSize: 13.5, lineHeight: 20, color: C.sec }}
            >
              {card.detail}
            </PretendardFont>
          </View>
        ) : null}
      </View>

      <View className="flex-row items-center gap-2">
        <Feather name="chevrons-left" size={15} color={C.ter} />
        <PretendardFont style={{ fontSize: 12, color: C.ter }}>
          좌우로 넘겨 다른 카드를 선택하세요
        </PretendardFont>
        <Feather name="chevrons-right" size={15} color={C.ter} />
      </View>
    </View>
  );
}
