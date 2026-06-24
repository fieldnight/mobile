import { ActivityIndicator, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Card } from "@/components/hive/hive-shared";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import { useHiveStore } from "@/stores/useHiveStore";
import { useHiveReplacementHistoryList } from "../hooks/useHiveReplacementHistory";
import { getReplacementElapsed } from "../model/replacement";

interface HiveReplacementTableProps {
  hiveId?: string;
}

/** 리포트 페이지의 교체 히스토리 조회 전용 테이블 */
export function HiveReplacementTable({ hiveId }: HiveReplacementTableProps) {
  const hives = useHiveStore((state) => state.hives);
  const hive = hiveId ? hives.find((item) => item.id === hiveId) : hives[0];
  const historyQuery = useHiveReplacementHistoryList(hive?.id);
  const history = historyQuery.data?.content ?? [];

  return (
    <Card
      delay={200}
      style={{
        marginHorizontal: -14,
        backgroundColor: "rgba(255,255,255,0.72)",
        elevation: 0,
      }}
    >
      <View className="mb-4 flex-row items-center justify-between">
        <View>
          <PretendardFont weight="bold" style={{ fontSize: 17, color: C.text }}>
            교체 히스토리
          </PretendardFont>
          <PretendardFont style={{ fontSize: 13, color: C.sec, marginTop: 2 }}>
            {hive?.name ?? "선택된 벌통"} 기준
          </PretendardFont>
        </View>
        <View
          className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
          style={{ backgroundColor: C.bgAlt }}
        >
          {historyQuery.isLoading ? (
            <ActivityIndicator size="small" color={C.sec} />
          ) : (
            <>
              <Feather name="archive" size={12} color={C.sec} />
              <PretendardFont weight="semibold" style={{ fontSize: 12, color: C.sec }}>
                {history.length}건
              </PretendardFont>
            </>
          )}
        </View>
      </View>

      <View className="flex-row rounded-xl px-3 py-2" style={{ backgroundColor: C.bgAlt }}>
        <PretendardFont weight="bold" style={{ flex: 1.4, fontSize: 12, color: C.sec }}>
          교체날짜
        </PretendardFont>
        <PretendardFont
          weight="bold"
          style={{ flex: 1, fontSize: 12, color: C.sec, textAlign: "right" }}
        >
          사용일수
        </PretendardFont>
      </View>

      <View>
        {historyQuery.isLoading ? (
          <View className="items-center py-5">
            <ActivityIndicator size="small" color={C.primary} />
          </View>
        ) : history.length ? (
          history.map((record, index) => {
            const elapsed = getReplacementElapsed(record.replacedAt, record.usageDays);

            return (
              <View
                key={record.replacementHistoryId}
                className="flex-row px-3 py-3"
                style={{
                  borderBottomWidth: index < history.length - 1 ? 1 : 0,
                  borderBottomColor: C.border,
                }}
              >
                <PretendardFont style={{ flex: 1.4, fontSize: 13, color: C.text }}>
                  {record.replacedAt}
                </PretendardFont>
                <PretendardFont
                  weight="semibold"
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: elapsed.isOverdue ? C.error : C.text,
                    textAlign: "right",
                  }}
                >
                  {elapsed.label}
                </PretendardFont>
              </View>
            );
          })
        ) : (
          <View className="px-3 py-4">
            <PretendardFont style={{ fontSize: 13, color: C.ter }}>
              아직 등록된 교체 히스토리가 없습니다.
            </PretendardFont>
          </View>
        )}
      </View>
    </Card>
  );
}
