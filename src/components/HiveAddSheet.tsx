/**
 * 벌통 추가 바텀시트
 * - hive-add 페이지의 폼 로직을 바텀시트 안으로 이전
 * - BottomSheet 공용 컴포넌트 위에 올라갑니다
 * - 완료 시 토스트 알림 + 자동 닫힘
 */
import { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  TextInput,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { BottomSheet } from "@/components/BottomSheet";
import { PretendardFont } from "@/components/PretendardFont";
import { useAppToast } from "@/components/ToastContext";
import { useHiveStore } from "@/stores/useHiveStore";
import { C } from "@/constants/hive-colors";

interface HiveAddSheetProps {
  visible: boolean;
  onClose: () => void;
}

const formatDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export function HiveAddSheet({ visible, onClose }: HiveAddSheetProps) {
  const addHive = useHiveStore((s) => s.addHive);
  const { show: showToast } = useAppToast();

  const [name, setName]         = useState("");
  const [location, setLocation] = useState("");
  const [memo, setMemo]         = useState("");
  const [replacedAt, setReplacedAt] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const canSubmit = name.trim() !== "" && location.trim() !== "";

  const resetAndClose = () => {
    setName(""); setLocation(""); setMemo(""); setReplacedAt(null);
    onClose();
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addHive(name.trim(), location.trim(), memo.trim(), replacedAt ? formatDate(replacedAt) : undefined);
    showToast(`${name.trim()} 벌통을 추가했어요.`, "success");
    resetAndClose();
  };

  return (
    <BottomSheet visible={visible} onClose={resetAndClose} title="벌통 추가">
      {/* 안내 배너 */}
      <View
        className="rounded-2xl p-4 mb-2"
        style={{ backgroundColor: C.infoBg }}
      >
        <PretendardFont weight="semibold" style={{ fontSize: 13, color: C.primary, lineHeight: 20 }}>
          위치와 이름을 입력하면 내 벌통 목록에 바로 등록됩니다.
        </PretendardFont>
      </View>

      {/* 벌통 이름 */}
      <FieldLabel label="벌통 이름" required />
      <FakeInputRow
        value={name}
        onChangeText={setName}
        placeholder="예: 벌통 4호"
        active={!!name}
      />

      {/* 위치 */}
      <FieldLabel label="위치" required />
      <FakeInputRow
        value={location}
        onChangeText={setLocation}
        placeholder="예: 남쪽 창고 옆"
        active={!!location}
      />

      {/* 메모 */}
      <FieldLabel label="메모" />
      <FakeInputMultiline
        value={memo}
        onChangeText={setMemo}
        placeholder="벌통 상태, 특징, 점검 메모 등"
      />

      {/* 교체일 (선택) */}
      <FieldLabel label="교체일" hint="선택사항" />
      <Pressable
        onPress={() => setShowDatePicker(true)}
        className="flex-row items-center justify-between rounded-2xl px-4"
        style={{
          height: 48,
          backgroundColor: C.bgAlt,
          borderWidth: 1,
          borderColor: C.border,
        }}
      >
        <PretendardFont style={{ fontSize: 14, color: replacedAt ? C.text : C.ter }}>
          {replacedAt ? formatDate(replacedAt) : "날짜를 선택하세요"}
        </PretendardFont>
        <Feather name="calendar" size={16} color={C.ter} />
      </Pressable>

      {/* iOS 날짜 선택기 */}
      {Platform.OS === "ios" && showDatePicker && (
        <Modal transparent animationType="slide">
          <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
            <View style={{ backgroundColor: C.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 }}>
              <View className="flex-row justify-between items-center mb-2">
                <Pressable onPress={() => setShowDatePicker(false)}>
                  <PretendardFont style={{ fontSize: 16, color: C.ter }}>취소</PretendardFont>
                </Pressable>
                <Pressable onPress={() => setShowDatePicker(false)}>
                  <PretendardFont weight="semibold" style={{ fontSize: 16, color: C.primary }}>확인</PretendardFont>
                </Pressable>
              </View>
              <DateTimePicker
                value={replacedAt ?? new Date()}
                mode="date"
                display="inline"
                maximumDate={new Date()}
                onChange={(_, date) => { if (date) setReplacedAt(date); }}
                locale="ko-KR"
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Android 날짜 선택기 */}
      {Platform.OS === "android" && showDatePicker && (
        <DateTimePicker
          value={replacedAt ?? new Date()}
          mode="date"
          display="calendar"
          maximumDate={new Date()}
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (event.type === "set" && date) setReplacedAt(date);
          }}
        />
      )}

      {/* 하단 버튼 */}
      <View className="mt-6 flex-row" style={{ gap: 10 }}>
        <Pressable
          onPress={resetAndClose}
          className="flex-1 items-center rounded-2xl py-4 active:opacity-80"
          style={{ backgroundColor: C.bgAlt, borderWidth: 1, borderColor: C.border }}
        >
          <PretendardFont weight="bold" style={{ fontSize: 14, color: C.textAlt }}>
            취소
          </PretendardFont>
        </Pressable>
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          className="flex-1 items-center rounded-2xl py-4 active:opacity-80"
          style={{ backgroundColor: canSubmit ? C.primary : C.border }}
        >
          <PretendardFont weight="bold" style={{ fontSize: 14, color: C.white }}>
            등록하기
          </PretendardFont>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

/**
 * 단일 줄 입력 — placeholder를 PretendardFont로 오버레이
 * TextInput의 placeholder는 fontFamily 제어가 안 되므로 직접 그린다
 */
function FakeInputRow({
  value,
  onChangeText,
  placeholder,
  active,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  active: boolean;
}) {
  return (
    <View
      className="rounded-2xl px-4 justify-center"
      style={{
        height: 48,
        backgroundColor: C.bgAlt,
        borderWidth: 1,
        borderColor: active ? C.primary : C.border,
      }}
    >
      {/* 값이 없을 때만 placeholder 오버레이 */}
      {!value && (
        <PretendardFont
          weight="medium"
          style={{ fontSize: 14, color: C.ter, position: "absolute", left: 16, pointerEvents: "none" }}
        >
          {placeholder}
        </PretendardFont>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={{
          fontFamily: "Pretendard-Medium",
          fontSize: 14,
          color: C.text,
          padding: 0,
        }}
      />
    </View>
  );
}

/**
 * 멀티라인 입력 — placeholder를 PretendardFont로 오버레이
 */
function FakeInputMultiline({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
}) {
  return (
    <View
      className="rounded-2xl px-4 py-3"
      style={{
        minHeight: 88,
        backgroundColor: C.bgAlt,
        borderWidth: 1,
        borderColor: C.border,
      }}
    >
      {!value && (
        <PretendardFont
          style={{ fontSize: 14, color: C.ter, position: "absolute", top: 12, left: 16, pointerEvents: "none" }}
        >
          {placeholder}
        </PretendardFont>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline
        style={{
          fontFamily: "Pretendard-Regular",
          fontSize: 14,
          color: C.text,
          textAlignVertical: "top",
          padding: 0,
          minHeight: 64,
        }}
      />
    </View>
  );
}

function FieldLabel({ label, required, hint }: { label: string; required?: boolean; hint?: string }) {
  return (
    <View className="flex-row items-center gap-1 mt-5 mb-2">
      <PretendardFont weight="bold" style={{ fontSize: 13, color: C.text }}>
        {label}
      </PretendardFont>
      {required && (
        <PretendardFont weight="bold" style={{ fontSize: 13, color: C.error }}>*</PretendardFont>
      )}
      {hint && (
        <PretendardFont style={{ fontSize: 12, color: C.ter }}>({hint})</PretendardFont>
      )}
    </View>
  );
}
