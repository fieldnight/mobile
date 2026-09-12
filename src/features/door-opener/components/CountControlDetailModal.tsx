/**
 * 벌 마릿수 제어 카드의 전체화면 상세 모달입니다.
 * 그리드 카드는 시간제어 카드와 같은 요약 크기라 반복 요일·마릿수 구간·시간 구간·
 * 구간별 입출구 개폐표까지 다 보여줄 공간이 없어서, 카드를 탭하면 이 모달이 뜨고
 * 카드 추가 때 설정했던 정보를 그대로 다시 보여줍니다. 실제 NFC 태깅(개폐기 적용)은
 * 이 모달 안의 "적용하기" 버튼을 눌러야 시작됩니다.
 */
import { Modal, Pressable, ScrollView, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import {
  describeGateOpenState,
  describeRepeatDays,
  isRepeatDaysEmpty,
  isTimeWindowAllDay,
  type NfcDoorCardConfig,
} from "./nfcDoorCards";

const DAY_LABELS: Array<[key: "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat", label: string]> = [
  ["sun", "일"],
  ["mon", "월"],
  ["tue", "화"],
  ["wed", "수"],
  ["thu", "목"],
  ["fri", "금"],
  ["sat", "토"],
];

export function CountControlDetailModal({
  card,
  visible,
  active,
  runtimeLabel,
  onClose,
  onApply,
  onDelete,
}: {
  card: NfcDoorCardConfig | null;
  visible: boolean;
  active?: boolean;
  runtimeLabel?: string | null;
  onClose: () => void;
  onApply: () => void;
  onDelete?: () => void;
}) {
  if (!card || !card.countControl) return null;
  const countControl = card.countControl;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
        <Pressable className="absolute inset-0" onPress={onClose} />

        <View
          style={{
            maxHeight: "82%",
            backgroundColor: C.white,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 12,
          }}
        >
          <View className="items-center pb-2">
            <View className="h-1 w-10 rounded-full" style={{ backgroundColor: C.border }} />
          </View>

          <View className="flex-row items-center justify-between px-5 pb-3">
            <View className="flex-1 flex-row items-center" style={{ gap: 10 }}>
              <View
                className="items-center justify-center rounded-full"
                style={{
                  width: 40,
                  height: 40,
                  backgroundColor: active ? C.stIconBadgeOn : C.stIconBadgeOff,
                }}
              >
                <Feather name="sliders" size={18} color={active ? C.white : C.stIconOff} />
              </View>
              <View style={{ flex: 1 }}>
                <PretendardFont weight="bold" numberOfLines={1} style={{ fontSize: 17, color: C.text }}>
                  {card.title}
                </PretendardFont>
                <PretendardFont
                  weight="medium"
                  numberOfLines={1}
                  style={{ fontSize: 12.5, color: active ? C.stIconBadgeOn : C.sec }}
                >
                  {active && runtimeLabel ? runtimeLabel : active ? "실행중" : "대기 중"}
                </PretendardFont>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={12} className="active:opacity-60">
              <Feather name="x" size={20} color={C.ter} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          >
            <View style={{ gap: 14 }}>
              <DetailRow label="기준 카운터" value="현재 활동중인 벌 마릿수(출구로 나간 수 - 입구로 들어온 수)" />
              <DetailRow label="마릿수 구간" value={`${countControl.low}~${countControl.high}마리`} />
              <DetailRow
                label="시간 구간"
                value={
                  isTimeWindowAllDay(countControl)
                    ? "하루 종일"
                    : `${countControl.timeWindowStart} ~ ${countControl.timeWindowEnd}`
                }
              />
              <DetailRow label="반복" value={describeRepeatDays(countControl.repeatDays)} />

              {!isRepeatDaysEmpty(countControl.repeatDays) ? (
                <View className="flex-row" style={{ gap: 6 }}>
                  {DAY_LABELS.map(([key, label]) => {
                    const selected = countControl.repeatDays[key];
                    return (
                      <View
                        key={key}
                        className="items-center justify-center rounded-full"
                        style={{
                          width: 28,
                          height: 28,
                          backgroundColor: selected ? C.gatePrimary : C.stCardBg,
                        }}
                      >
                        <PretendardFont
                          weight="bold"
                          style={{ fontSize: 11.5, color: selected ? C.white : C.ter }}
                        >
                          {label}
                        </PretendardFont>
                      </View>
                    );
                  })}
                </View>
              ) : null}

              <View>
                <PretendardFont weight="bold" style={{ fontSize: 13.5, color: C.textAlt, marginBottom: 8 }}>
                  구간별 입구·출구 개폐
                </PretendardFont>
                <View style={{ gap: 6 }}>
                  <DetailTableRow
                    label={`${countControl.low}~${countControl.high}마리`}
                    value={describeGateOpenState(countControl.within)}
                  />
                  <DetailTableRow
                    label={`${countControl.high}마리 이상`}
                    value={describeGateOpenState(countControl.above)}
                  />
                </View>
              </View>
            </View>

            <View className="mt-6 flex-row" style={{ gap: 10 }}>
              {card.removable && onDelete ? (
                <Pressable
                  onPress={onDelete}
                  className="items-center justify-center rounded-2xl active:opacity-70"
                  style={{ width: 52, backgroundColor: C.stCardBg }}
                >
                  <Feather name="trash-2" size={18} color={C.error} />
                </Pressable>
              ) : null}
              <Pressable
                onPress={onApply}
                className="flex-1 items-center rounded-2xl py-4 active:opacity-80"
                style={{ backgroundColor: C.gatePrimary }}
              >
                <PretendardFont weight="bold" style={{ fontSize: 15, color: C.white }}>
                  적용하기
                </PretendardFont>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between" style={{ gap: 12 }}>
      <PretendardFont weight="bold" style={{ fontSize: 13, color: C.textAlt, width: 82 }}>
        {label}
      </PretendardFont>
      <PretendardFont
        weight="medium"
        style={{ flex: 1, fontSize: 13, lineHeight: 19, color: C.text, textAlign: "right" }}
      >
        {value}
      </PretendardFont>
    </View>
  );
}

function DetailTableRow({ label, value }: { label: string; value: string }) {
  return (
    <View
      className="flex-row items-center justify-between rounded-xl px-3 py-2.5"
      style={{ backgroundColor: C.stCardBg }}
    >
      <PretendardFont weight="semibold" style={{ fontSize: 12.5, color: C.textAlt }}>
        {label}
      </PretendardFont>
      <PretendardFont weight="bold" style={{ fontSize: 12.5, color: C.text }}>
        {value}
      </PretendardFont>
    </View>
  );
}
