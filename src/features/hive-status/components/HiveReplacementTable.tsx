import { View, Pressable, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { Card } from "@/components/hive/hive-shared";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import { useHiveStore } from "@/stores/useHiveStore";

const CYCLE_DAYS = 45;

function getDayStatus(replacedAt?: string): {
  label: string;
} {
  if (!replacedAt) return { label: "미등록" };

  const replaced = new Date(replacedAt);
  if (Number.isNaN(replaced.getTime())) return { label: "미등록" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  replaced.setHours(0, 0, 0, 0);

  const elapsed = Math.floor((today.getTime() - replaced.getTime()) / 86400000);

  if (elapsed > CYCLE_DAYS) return { label: `${elapsed}일 (초과)` };
  return { label: `${elapsed}일` };
}

/**
 * HiveReplacementTable
 * - 전체 벌통의 교체 현황을 표로 표시합니다.
 * - 45일 사이클 기준 D-day와 "교체 완료" 버튼을 제공합니다.
 * - hive-stats.tsx에서 사용됩니다.
 */
export function HiveReplacementTable() {
  const hives = useHiveStore((state) => state.hives);
  const updateReplacedAt = useHiveStore((state) => state.updateReplacedAt);

  const handleReplace = (id: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateReplacedAt(id);
  };

  return (
    <Card delay={200} style={{ marginHorizontal: -14, backgroundColor: "rgba(255,255,255,0.643)", elevation: 0 }}>
      <View className="flex-row items-center justify-between mb-4">
        <View>
          <PretendardFont weight="bold" style={{ fontSize: 17, color: C.text }}>
            벌통 교체 현황
          </PretendardFont>
          <PretendardFont style={{ fontSize: 13, color: C.sec, marginTop: 2 }}>
            교체 주기 {CYCLE_DAYS}일 기준
          </PretendardFont>
        </View>
        <View
          className="flex-row items-center gap-1 px-2.5 py-1 rounded-xl"
          style={{ backgroundColor: C.bgAlt }}
        >
          <Feather name="refresh-cw" size={12} color={C.sec} />
          <PretendardFont weight="semibold" style={{ fontSize: 12, color: C.sec }}>
            {hives.length}개 벌통
          </PretendardFont>
        </View>
      </View>

      {/* 헤더 */}
      <View
        className="flex-row px-3 py-2 rounded-xl mb-1"
        style={{ backgroundColor: C.bgAlt }}
      >
        <PretendardFont weight="bold" style={{ fontSize: 13, color: C.text, flex: 2 }}>
          벌통
        </PretendardFont>
        <PretendardFont weight="bold" style={{ fontSize: 13, color: C.text, flex: 2.5, textAlign: "center" }}>
          마지막 교체일
        </PretendardFont>
        <PretendardFont weight="bold" style={{ fontSize: 13, color: C.text, flex: 1.5, textAlign: "center" }}>
          사용 일수
        </PretendardFont>
        <View style={{ flex: 1.5 }} />
      </View>

      {/* 행 */}
      {hives.map((hive, i) => {
        const status = getDayStatus(hive.replacedAt);
        return (
          <View
            key={hive.id}
            className="flex-row items-center px-3 py-3"
            style={{
              borderBottomWidth: i < hives.length - 1 ? 1 : 0,
              borderBottomColor: C.border,
            }}
          >
            <PretendardFont
              weight="semibold"
              style={{ fontSize: 13, color: C.text, flex: 2 }}
              numberOfLines={1}
            >
              {hive.name}
            </PretendardFont>

            <PretendardFont
              style={{ fontSize: 13, color: C.text, flex: 2.5, textAlign: "center" }}
            >
              {hive.replacedAt ?? "—"}
            </PretendardFont>

            <View style={{ flex: 1.5, alignItems: "center" }}>
              <PretendardFont
                weight="semibold"
                style={{ fontSize: 13, color: C.text }}
              >
                {status.label}
              </PretendardFont>
            </View>

            <View style={{ flex: 1.5, alignItems: "flex-end" }}>
              <Pressable
                onPress={() => handleReplace(hive.id)}
                className="px-2.5 py-1.5 rounded-xl"
                style={{ backgroundColor: C.text }}
              >
                <PretendardFont
                  weight="semibold"
                  style={{ fontSize: 12, color: C.white }}
                >
                  교체완료
                </PretendardFont>
              </Pressable>
            </View>
          </View>
        );
      })}
    </Card>
  );
}
